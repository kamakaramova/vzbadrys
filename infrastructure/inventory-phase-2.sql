-- Складской учёт «взБАДрись»: партии, движения и распределение заказов.
-- Скрипт идемпотентный: его безопасно запускать повторно в Supabase SQL Editor.

create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete restrict,
  lot_number text not null,
  manufactured_at date,
  received_at date not null default current_date,
  expires_at date,
  received_quantity bigint not null check (received_quantity >= 0),
  remaining_quantity bigint not null check (remaining_quantity >= 0),
  status text not null default 'active' check (status in ('active', 'quarantined', 'depleted')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, lot_number)
);
alter table public.inventory_batches enable row level security;
create index if not exists inventory_batches_fifo_idx
  on public.inventory_batches (product_id, status, expires_at nulls last, manufactured_at nulls last, created_at);
create index if not exists inventory_batches_expiry_idx
  on public.inventory_batches (expires_at) where status = 'active' and remaining_quantity > 0;

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.inventory_batches(id) on delete restrict,
  product_id text not null references public.products(id) on delete restrict,
  order_id text references public.payment_orders(id) on delete set null,
  kind text not null check (kind in ('opening', 'receipt', 'sale', 'sale_unallocated', 'return', 'writeoff', 'adjustment', 'reassignment')),
  quantity bigint not null check (quantity <> 0),
  reason text,
  created_at timestamptz not null default now()
);
alter table public.inventory_movements enable row level security;
create index if not exists inventory_movements_product_idx
  on public.inventory_movements (product_id, created_at desc);
create index if not exists inventory_movements_order_idx
  on public.inventory_movements (order_id, created_at desc) where order_id is not null;

create table if not exists public.order_batch_allocations (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.payment_orders(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  batch_id uuid references public.inventory_batches(id) on delete restrict,
  quantity bigint not null check (quantity > 0),
  status text not null default 'written_off' check (status in ('written_off', 'returned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.order_batch_allocations enable row level security;
create index if not exists order_batch_allocations_order_idx
  on public.order_batch_allocations (order_id, product_id, created_at);
create unique index if not exists order_batch_allocations_active_unique
  on public.order_batch_allocations (order_id, product_id, batch_id)
  where status = 'written_off' and batch_id is not null;
create unique index if not exists order_batch_allocations_unallocated_unique
  on public.order_batch_allocations (order_id, product_id)
  where status = 'written_off' and batch_id is null;

create or replace function public.inventory_sync_product_stock(p_product_id text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  select coalesce(sum(remaining_quantity), 0)::bigint
    into v_total
    from public.inventory_batches
   where product_id = p_product_id
     and status <> 'quarantined';

  update public.products
     set data = jsonb_set(
       jsonb_set(data, '{stockQty}', to_jsonb(v_total), true),
       '{inStock}', to_jsonb(v_total > 0), true
     ),
         updated_at = now()
   where id = p_product_id;
  return v_total;
end;
$$;

create or replace function public.inventory_receive_batch(
  p_product_id text,
  p_lot_number text,
  p_manufactured_at date,
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
  if not exists (select 1 from public.products where id = p_product_id) then raise exception 'product_not_found'; end if;
  if p_manufactured_at is not null and p_expires_at is not null and p_expires_at < p_manufactured_at then
    raise exception 'expiry_before_manufacture';
  end if;

  insert into public.inventory_batches (
    product_id, lot_number, manufactured_at, expires_at,
    received_quantity, remaining_quantity, notes
  ) values (
    p_product_id, trim(p_lot_number), p_manufactured_at, p_expires_at,
    p_quantity, p_quantity, nullif(trim(coalesce(p_notes, '')), '')
  )
  on conflict (product_id, lot_number) do update
     set manufactured_at = coalesce(excluded.manufactured_at, inventory_batches.manufactured_at),
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

create or replace function public.inventory_allocate_order(p_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
  v_line record;
  v_batch record;
  v_required bigint;
  v_take bigint;
  v_left bigint;
  v_allocations jsonb := '[]'::jsonb;
begin
  select * into v_order from public.payment_orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  if exists (
    select 1 from public.order_batch_allocations
     where order_id = p_order_id and status = 'written_off'
  ) then
    return coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', a.product_id, 'batchId', a.batch_id,
        'lotNumber', b.lot_number, 'quantity', a.quantity,
        'unallocated', a.batch_id is null
      ) order by a.created_at)
      from public.order_batch_allocations a
      left join public.inventory_batches b on b.id = a.batch_id
      where a.order_id = p_order_id and a.status = 'written_off'
    ), '[]'::jsonb);
  end if;

  for v_line in
    select item->>'productId' as product_id,
           sum(greatest(0, floor(coalesce(nullif(item->>'stockAmount', '')::numeric, 0))))::bigint as required
      from jsonb_array_elements(v_order.items) item
     where nullif(item->>'productId', '') is not null
     group by item->>'productId'
  loop
    v_required := v_line.required;
    v_left := v_required;
    if v_required <= 0 then continue; end if;

    for v_batch in
      select id, lot_number, remaining_quantity
        from public.inventory_batches
       where product_id = v_line.product_id
         and status = 'active'
         and remaining_quantity > 0
       order by expires_at asc nulls last, manufactured_at asc nulls last, created_at asc
       for update
    loop
      exit when v_left <= 0;
      v_take := least(v_left, v_batch.remaining_quantity);
      update public.inventory_batches
         set remaining_quantity = remaining_quantity - v_take,
             status = case when remaining_quantity - v_take = 0 then 'depleted' else status end,
             updated_at = now()
       where id = v_batch.id;
      insert into public.order_batch_allocations (order_id, product_id, batch_id, quantity)
      values (p_order_id, v_line.product_id, v_batch.id, v_take);
      insert into public.inventory_movements (batch_id, product_id, order_id, kind, quantity, reason)
      values (v_batch.id, v_line.product_id, p_order_id, 'sale', -v_take, 'Списание оплаченного заказа');
      v_allocations := v_allocations || jsonb_build_array(jsonb_build_object(
        'productId', v_line.product_id, 'batchId', v_batch.id,
        'lotNumber', v_batch.lot_number, 'quantity', v_take, 'unallocated', false
      ));
      v_left := v_left - v_take;
    end loop;

    if v_left > 0 then
      insert into public.order_batch_allocations (order_id, product_id, batch_id, quantity)
      values (p_order_id, v_line.product_id, null, v_left);
      insert into public.inventory_movements (batch_id, product_id, order_id, kind, quantity, reason)
      values (null, v_line.product_id, p_order_id, 'sale_unallocated', -v_left, 'Не хватило остатка для распределения');
      v_allocations := v_allocations || jsonb_build_array(jsonb_build_object(
        'productId', v_line.product_id, 'batchId', null,
        'lotNumber', null, 'quantity', v_left, 'unallocated', true
      ));
    end if;
    perform public.inventory_sync_product_stock(v_line.product_id);
  end loop;

  update public.payment_orders
     set stock_written_off = true, updated_at = now()
   where id = p_order_id;
  return v_allocations;
end;
$$;

create or replace function public.inventory_return_order(p_order_id text, p_reason text default 'Отмена заказа')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation record;
  v_result jsonb := '[]'::jsonb;
begin
  perform 1 from public.payment_orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  for v_allocation in
    select * from public.order_batch_allocations
     where order_id = p_order_id and status = 'written_off'
     order by created_at
     for update
  loop
    if v_allocation.batch_id is not null then
      update public.inventory_batches
         set remaining_quantity = remaining_quantity + v_allocation.quantity,
             status = case when status = 'quarantined' then status else 'active' end,
             updated_at = now()
       where id = v_allocation.batch_id;
      insert into public.inventory_movements (batch_id, product_id, order_id, kind, quantity, reason)
      values (v_allocation.batch_id, v_allocation.product_id, p_order_id, 'return', v_allocation.quantity, p_reason);
    end if;
    update public.order_batch_allocations set status = 'returned', updated_at = now() where id = v_allocation.id;
    perform public.inventory_sync_product_stock(v_allocation.product_id);
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'productId', v_allocation.product_id, 'batchId', v_allocation.batch_id,
      'quantity', v_allocation.quantity
    ));
  end loop;
  update public.payment_orders set stock_written_off = false, updated_at = now() where id = p_order_id;
  return v_result;
end;
$$;

create or replace function public.inventory_adjust_batch(
  p_batch_id uuid,
  p_new_remaining bigint,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.inventory_batches%rowtype;
  v_delta bigint;
begin
  if p_new_remaining < 0 then raise exception 'negative_stock'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'reason_required'; end if;
  select * into v_batch from public.inventory_batches where id = p_batch_id for update;
  if not found then raise exception 'batch_not_found'; end if;
  v_delta := p_new_remaining - v_batch.remaining_quantity;
  if v_delta = 0 then return p_new_remaining; end if;
  update public.inventory_batches
     set remaining_quantity = p_new_remaining,
         status = case
           when status = 'quarantined' then status
           when p_new_remaining = 0 then 'depleted'
           else 'active'
         end,
         updated_at = now()
   where id = p_batch_id;
  insert into public.inventory_movements (batch_id, product_id, kind, quantity, reason)
  values (p_batch_id, v_batch.product_id, case when v_delta < 0 then 'writeoff' else 'adjustment' end, v_delta, trim(p_reason));
  perform public.inventory_sync_product_stock(v_batch.product_id);
  return p_new_remaining;
end;
$$;

create or replace function public.inventory_reassign_order_product(
  p_order_id text,
  p_product_id text,
  p_allocations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required bigint;
  v_supplied bigint;
  v_old record;
  v_new record;
  v_batch public.inventory_batches%rowtype;
  v_result jsonb := '[]'::jsonb;
begin
  perform 1 from public.payment_orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select coalesce(sum(greatest(0, floor(coalesce(nullif(item->>'stockAmount', '')::numeric, 0)))), 0)::bigint
    into v_required
    from jsonb_array_elements((select items from public.payment_orders where id = p_order_id)) item
   where item->>'productId' = p_product_id;
  select coalesce(sum((entry->>'quantity')::bigint), 0)::bigint
    into v_supplied from jsonb_array_elements(p_allocations) entry;
  if v_required <= 0 then raise exception 'product_not_in_order'; end if;
  if v_supplied <> v_required then raise exception 'allocation_total_mismatch'; end if;

  for v_old in
    select * from public.order_batch_allocations
     where order_id = p_order_id and product_id = p_product_id and status = 'written_off'
     for update
  loop
    if v_old.batch_id is not null then
      update public.inventory_batches
         set remaining_quantity = remaining_quantity + v_old.quantity,
             status = case when status = 'quarantined' then status else 'active' end,
             updated_at = now()
       where id = v_old.batch_id;
      insert into public.inventory_movements (batch_id, product_id, order_id, kind, quantity, reason)
      values (v_old.batch_id, p_product_id, p_order_id, 'reassignment', v_old.quantity, 'Возврат перед сменой партии');
    end if;
    update public.order_batch_allocations set status = 'returned', updated_at = now() where id = v_old.id;
  end loop;

  for v_new in
    select nullif(entry->>'batchId', '')::uuid as batch_id, (entry->>'quantity')::bigint as quantity
      from jsonb_array_elements(p_allocations) entry
  loop
    if v_new.quantity <= 0 then raise exception 'invalid_allocation_quantity'; end if;
    if v_new.batch_id is null then
      insert into public.order_batch_allocations (order_id, product_id, batch_id, quantity)
      values (p_order_id, p_product_id, null, v_new.quantity);
      insert into public.inventory_movements (product_id, order_id, kind, quantity, reason)
      values (p_product_id, p_order_id, 'sale_unallocated', -v_new.quantity, 'Ручное распределение: партия не указана');
      v_result := v_result || jsonb_build_array(jsonb_build_object('batchId', null, 'quantity', v_new.quantity));
      continue;
    end if;
    select * into v_batch from public.inventory_batches where id = v_new.batch_id and product_id = p_product_id for update;
    if not found then raise exception 'batch_not_found'; end if;
    if v_batch.status <> 'active' or v_batch.remaining_quantity < v_new.quantity then raise exception 'batch_stock_insufficient'; end if;
    update public.inventory_batches
       set remaining_quantity = remaining_quantity - v_new.quantity,
           status = case when remaining_quantity - v_new.quantity = 0 then 'depleted' else status end,
           updated_at = now()
     where id = v_new.batch_id;
    insert into public.order_batch_allocations (order_id, product_id, batch_id, quantity)
    values (p_order_id, p_product_id, v_new.batch_id, v_new.quantity);
    insert into public.inventory_movements (batch_id, product_id, order_id, kind, quantity, reason)
    values (v_new.batch_id, p_product_id, p_order_id, 'reassignment', -v_new.quantity, 'Ручная смена партии');
    v_result := v_result || jsonb_build_array(jsonb_build_object('batchId', v_new.batch_id, 'lotNumber', v_batch.lot_number, 'quantity', v_new.quantity));
  end loop;
  perform public.inventory_sync_product_stock(p_product_id);
  update public.payment_orders set stock_written_off = true, updated_at = now() where id = p_order_id;
  return v_result;
end;
$$;

-- Текущий остаток превращается в стартовую партию только один раз.
do $$
declare
  v_product record;
  v_batch_id uuid;
  v_qty bigint;
begin
  for v_product in select id, data from public.products loop
    if exists (select 1 from public.inventory_batches where product_id = v_product.id) then continue; end if;
    v_qty := greatest(0, floor(coalesce(nullif(v_product.data->>'stockQty', '')::numeric, 0)))::bigint;
    if v_qty = 0 then continue; end if;
    insert into public.inventory_batches (
      product_id, lot_number, received_quantity, remaining_quantity, notes
    ) values (
      v_product.id, 'СТАРТОВЫЙ-' || to_char(current_date, 'YYYYMMDD'), v_qty, v_qty,
      'Остаток до включения партионного учёта. Даты и номер партии можно уточнить в админке.'
    ) returning id into v_batch_id;
    insert into public.inventory_movements (batch_id, product_id, kind, quantity, reason)
    values (v_batch_id, v_product.id, 'opening', v_qty, 'Перенос текущего остатка');
  end loop;
end;
$$;

revoke all on public.inventory_batches from anon, authenticated;
revoke all on public.inventory_movements from anon, authenticated;
revoke all on public.order_batch_allocations from anon, authenticated;
revoke all on function public.inventory_sync_product_stock(text) from public, anon, authenticated;
revoke all on function public.inventory_receive_batch(text, text, date, date, bigint, text) from public, anon, authenticated;
revoke all on function public.inventory_allocate_order(text) from public, anon, authenticated;
revoke all on function public.inventory_return_order(text, text) from public, anon, authenticated;
revoke all on function public.inventory_adjust_batch(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.inventory_reassign_order_product(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.inventory_sync_product_stock(text) to service_role;
grant execute on function public.inventory_receive_batch(text, text, date, date, bigint, text) to service_role;
grant execute on function public.inventory_allocate_order(text) to service_role;
grant execute on function public.inventory_return_order(text, text) to service_role;
grant execute on function public.inventory_adjust_batch(uuid, bigint, text) to service_role;
grant execute on function public.inventory_reassign_order_product(text, text, jsonb) to service_role;
