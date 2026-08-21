-- Управленческий финансовый учёт «взБАДрись».
-- Без налоговой отчётности: только внутренние доходы, расходы и расчётный УСН.
-- Скрипт идемпотентный: его можно безопасно запускать повторно в Supabase SQL Editor.

alter table public.inventory_batches
  add column if not exists production_cost_kopecks bigint not null default 0
    check (production_cost_kopecks >= 0);

create table if not exists public.financial_expenses (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null default current_date,
  period_from date,
  period_to date,
  amount_kopecks bigint not null check (amount_kopecks > 0),
  category text not null check (category in (
    'production', 'raw_materials', 'packaging', 'laboratory', 'design',
    'server', 'software', 'marketing', 'payment_fee', 'tax', 'refund', 'other'
  )),
  description text,
  batch_id uuid references public.inventory_batches(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_to is null or period_from is null or period_to >= period_from)
);

alter table public.financial_expenses enable row level security;
create index if not exists financial_expenses_occurred_on_idx
  on public.financial_expenses (occurred_on desc);
create index if not exists financial_expenses_batch_idx
  on public.financial_expenses (batch_id) where batch_id is not null;

create table if not exists public.financial_settings (
  singleton boolean primary key default true check (singleton),
  usn_rate_bps integer not null default 600 check (usn_rate_bps between 0 and 3000),
  updated_at timestamptz not null default now()
);

alter table public.financial_settings enable row level security;
insert into public.financial_settings (singleton, usn_rate_bps)
values (true, 600)
on conflict (singleton) do nothing;

revoke all on public.financial_expenses from public, anon, authenticated;
revoke all on public.financial_settings from public, anon, authenticated;
grant all on public.financial_expenses to service_role;
grant all on public.financial_settings to service_role;

create or replace function public.inventory_receive_batch_v3(
  p_product_id text,
  p_lot_number text,
  p_manufactured_at date,
  p_received_at date,
  p_expires_at date,
  p_quantity bigint,
  p_notes text default null,
  p_production_cost_kopecks bigint default 0
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_batch_id uuid;
begin
  if p_quantity <= 0 then raise exception 'quantity_must_be_positive'; end if;
  if nullif(trim(p_lot_number), '') is null then raise exception 'lot_number_required'; end if;
  if p_received_at is null then raise exception 'received_at_required'; end if;
  if p_production_cost_kopecks < 0 then raise exception 'production_cost_must_be_nonnegative'; end if;
  if not exists (select 1 from public.products where id = p_product_id) then raise exception 'product_not_found'; end if;
  if p_manufactured_at is not null and p_expires_at is not null and p_expires_at < p_manufactured_at then raise exception 'expiry_before_manufacture'; end if;

  insert into public.inventory_batches (
    product_id, lot_number, manufactured_at, received_at, expires_at,
    received_quantity, remaining_quantity, notes, production_cost_kopecks
  ) values (
    p_product_id, trim(p_lot_number), p_manufactured_at, p_received_at, p_expires_at,
    p_quantity, p_quantity, nullif(trim(coalesce(p_notes, '')), ''), p_production_cost_kopecks
  ) on conflict (product_id, lot_number) do update set
    manufactured_at = coalesce(excluded.manufactured_at, inventory_batches.manufactured_at),
    received_at = least(inventory_batches.received_at, excluded.received_at),
    expires_at = coalesce(excluded.expires_at, inventory_batches.expires_at),
    received_quantity = inventory_batches.received_quantity + excluded.received_quantity,
    remaining_quantity = inventory_batches.remaining_quantity + excluded.remaining_quantity,
    notes = coalesce(excluded.notes, inventory_batches.notes),
    production_cost_kopecks = inventory_batches.production_cost_kopecks + excluded.production_cost_kopecks,
    status = case when inventory_batches.status = 'quarantined' then 'quarantined' else 'active' end,
    updated_at = now()
  returning id into v_batch_id;
  insert into public.inventory_movements (batch_id, product_id, kind, quantity, reason)
  values (v_batch_id, p_product_id, 'receipt', p_quantity, 'Приёмка партии');
  perform public.inventory_sync_product_stock(p_product_id);
  return v_batch_id;
end;
$$;

create or replace function public.inventory_update_batch_metadata_v2(
  p_batch_id uuid, p_lot_number text, p_manufactured_at date, p_received_at date,
  p_expires_at date, p_notes text default null, p_production_cost_kopecks bigint default 0
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if nullif(trim(p_lot_number), '') is null then raise exception 'lot_number_required'; end if;
  if p_received_at is null then raise exception 'received_at_required'; end if;
  if p_production_cost_kopecks < 0 then raise exception 'production_cost_must_be_nonnegative'; end if;
  if p_manufactured_at is not null and p_expires_at is not null and p_expires_at < p_manufactured_at then raise exception 'expiry_before_manufacture'; end if;
  update public.inventory_batches set
    lot_number = trim(p_lot_number), manufactured_at = p_manufactured_at, received_at = p_received_at,
    expires_at = p_expires_at, notes = nullif(trim(coalesce(p_notes, '')), ''),
    production_cost_kopecks = p_production_cost_kopecks, updated_at = now()
  where id = p_batch_id;
  if not found then raise exception 'batch_not_found'; end if;
end;
$$;

revoke all on function public.inventory_receive_batch_v3(text, text, date, date, date, bigint, text, bigint) from public, anon, authenticated;
revoke all on function public.inventory_update_batch_metadata_v2(uuid, text, date, date, date, text, bigint) from public, anon, authenticated;
grant execute on function public.inventory_receive_batch_v3(text, text, date, date, date, bigint, text, bigint) to service_role;
grant execute on function public.inventory_update_batch_metadata_v2(uuid, text, date, date, date, text, bigint) to service_role;
