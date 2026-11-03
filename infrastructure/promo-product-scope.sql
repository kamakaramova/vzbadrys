-- Применить перед выпуском кода, чтобы старые промокоды продолжали работать.
-- NULL = все товары; непустой массив = только выбранные ID товаров.
alter table public.promo_codes
  add column if not exists product_ids text[];

alter table public.promo_codes
  drop constraint if exists promo_codes_product_ids_nonempty;
alter table public.promo_codes
  add constraint promo_codes_product_ids_nonempty
  check (product_ids is null or cardinality(product_ids) > 0);

create index if not exists payment_orders_promo_usage_idx
  on public.payment_orders (promo_code, status, created_at);

-- Резервирование одного применения должно быть атомарным даже при двух
-- одновременных заказах. Заказ уже создан со статусом creating; блокировка
-- строки промокода сериализует конкурирующие проверки.
create or replace function public.promo_claim_order(p_order_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
  v_promo public.promo_codes%rowtype;
  v_paid_count bigint;
  v_earlier_pending_count bigint;
begin
  select * into v_order from public.payment_orders where id = p_order_id for update;
  if not found or v_order.promo_code is null then return false; end if;

  select * into v_promo from public.promo_codes
    where code = v_order.promo_code for update;
  if not found or not v_promo.active
     or (v_promo.expires_at is not null and v_promo.expires_at < now()) then
    return false;
  end if;
  if v_promo.max_uses is null then return true; end if;

  select count(*) into v_paid_count
    from public.payment_orders
   where promo_code = v_promo.code and status = 'paid' and id <> p_order_id;
  select count(*) into v_earlier_pending_count
    from public.payment_orders
   where promo_code = v_promo.code and id <> p_order_id
     and status in ('creating', 'awaiting_payment', 'authorized', 'processing_payment', 'payment_processing_error')
     and created_at >= now() - interval '2 hours'
     and (created_at, id) < (v_order.created_at, v_order.id);

  return greatest(v_promo.usage_count::bigint, v_paid_count) + v_earlier_pending_count < v_promo.max_uses;
end;
$$;

revoke all on function public.promo_claim_order(text) from public, anon, authenticated;
grant execute on function public.promo_claim_order(text) to service_role;

-- Синхронизация счётчика из оплаченных заказов не теряет обновления при
-- одновременных платежах и не удваивает повторный webhook.
create or replace function public.promo_sync_usage_count(p_code text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.promo_codes
     set usage_count = greatest(usage_count, (
       select count(*)::integer from public.payment_orders
        where promo_code = p_code and status = 'paid'
     )), updated_at = now()
   where code = p_code
   returning usage_count into v_count;
  return v_count;
end;
$$;

revoke all on function public.promo_sync_usage_count(text) from public, anon, authenticated;
grant execute on function public.promo_sync_usage_count(text) to service_role;
