-- Редактирование реквизитов складской партии.
-- Скрипт идемпотентный: его безопасно запускать повторно в Supabase SQL Editor.

alter table public.inventory_batches
  add column if not exists received_at date;

update public.inventory_batches
   set received_at = created_at::date
 where received_at is null;

alter table public.inventory_batches
  alter column received_at set default current_date,
  alter column received_at set not null;

create or replace function public.inventory_receive_batch_v2(
  p_product_id text,
  p_lot_number text,
  p_manufactured_at date,
  p_received_at date,
  p_expires_at date,
  p_quantity bigint,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
begin
  if p_quantity <= 0 then raise exception 'quantity_must_be_positive'; end if;
  if nullif(trim(p_lot_number), '') is null then raise exception 'lot_number_required'; end if;
  if p_received_at is null then raise exception 'received_at_required'; end if;
  if not exists (select 1 from public.products where id = p_product_id) then raise exception 'product_not_found'; end if;
  if p_manufactured_at is not null and p_expires_at is not null and p_expires_at < p_manufactured_at then
    raise exception 'expiry_before_manufacture';
  end if;

  insert into public.inventory_batches (
    product_id, lot_number, manufactured_at, received_at, expires_at,
    received_quantity, remaining_quantity, notes
  ) values (
    p_product_id, trim(p_lot_number), p_manufactured_at, p_received_at, p_expires_at,
    p_quantity, p_quantity, nullif(trim(coalesce(p_notes, '')), '')
  )
  on conflict (product_id, lot_number) do update
     set manufactured_at = coalesce(excluded.manufactured_at, inventory_batches.manufactured_at),
         received_at = least(inventory_batches.received_at, excluded.received_at),
         expires_at = coalesce(excluded.expires_at, inventory_batches.expires_at),
         received_quantity = inventory_batches.received_quantity + excluded.received_quantity,
         remaining_quantity = inventory_batches.remaining_quantity + excluded.remaining_quantity,
         notes = coalesce(excluded.notes, inventory_batches.notes),
         status = case when inventory_batches.status = 'quarantined' then 'quarantined' else 'active' end,
         updated_at = now()
  returning id into v_batch_id;

  insert into public.inventory_movements (batch_id, product_id, kind, quantity, reason)
  values (v_batch_id, p_product_id, 'receipt', p_quantity, 'Приёмка партии');
  perform public.inventory_sync_product_stock(p_product_id);
  return v_batch_id;
end;
$$;

create or replace function public.inventory_update_batch_metadata(
  p_batch_id uuid,
  p_lot_number text,
  p_manufactured_at date,
  p_received_at date,
  p_expires_at date,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(p_lot_number), '') is null then raise exception 'lot_number_required'; end if;
  if p_received_at is null then raise exception 'received_at_required'; end if;
  if p_manufactured_at is not null and p_expires_at is not null and p_expires_at < p_manufactured_at then
    raise exception 'expiry_before_manufacture';
  end if;

  update public.inventory_batches
     set lot_number = trim(p_lot_number),
         manufactured_at = p_manufactured_at,
         received_at = p_received_at,
         expires_at = p_expires_at,
         notes = nullif(trim(coalesce(p_notes, '')), ''),
         updated_at = now()
   where id = p_batch_id;

  if not found then raise exception 'batch_not_found'; end if;
end;
$$;

revoke all on function public.inventory_receive_batch_v2(text, text, date, date, date, bigint, text) from public, anon, authenticated;
revoke all on function public.inventory_update_batch_metadata(uuid, text, date, date, date, text) from public, anon, authenticated;
grant execute on function public.inventory_receive_batch_v2(text, text, date, date, date, bigint, text) to service_role;
grant execute on function public.inventory_update_batch_metadata(uuid, text, date, date, date, text) to service_role;
