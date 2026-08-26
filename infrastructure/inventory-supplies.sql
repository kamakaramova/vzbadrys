-- Общие поставки склада «взБАДрись».
-- Одна поставка может состоять из нескольких товарных партий: например,
-- трёх разных БАДов, произведённых и принятых в один день.
-- Скрипт идемпотентный: его можно безопасно запускать повторно.

create table if not exists public.inventory_supplies (
  id uuid primary key default gen_random_uuid(),
  supply_number text not null unique,
  manufactured_at date,
  received_at date not null,
  expires_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or manufactured_at is null or expires_at >= manufactured_at)
);

alter table public.inventory_supplies enable row level security;
revoke all on public.inventory_supplies from public, anon, authenticated;
grant all on public.inventory_supplies to service_role;

alter table public.inventory_batches
  add column if not exists supply_id uuid references public.inventory_supplies(id) on delete set null;

create index if not exists inventory_batches_supply_idx
  on public.inventory_batches (supply_id, product_id);

-- Расходы теперь можно относить к одной общей поставке, а не к каждой
-- банке по отдельности. Старые связи с товарной партией сохраняем для
-- истории и перенесём в общую поставку ниже.
alter table public.financial_expenses
  add column if not exists supply_id uuid references public.inventory_supplies(id) on delete restrict;

create index if not exists financial_expenses_supply_idx
  on public.financial_expenses (supply_id) where supply_id is not null;

-- Текущая первая поставка: три БАДa приняты в один день и имеют
-- один стартовый номер. Количества, остатки и списания заказов не меняются.
with supply as (
  insert into public.inventory_supplies (supply_number, received_at, notes)
  values (
    'Поставка БАДов · 20.08.2026',
    date '2026-08-20',
    'Первая общая поставка: Селен+цинк, Магний Цитрат + B6 и Магния хелат (бисглицинат).'
  )
  on conflict (supply_number) do update set updated_at = now()
  returning id
)
update public.inventory_batches
   set supply_id = (select id from supply), updated_at = now()
 where id in (
   '947b261c-4008-4d66-bd34-86110ced9b28'::uuid,
   'c19ea74a-1591-4312-a3b5-16495a842db8'::uuid,
   '0bcf1e1b-b00b-4179-9a3e-cca96e7fcb04'::uuid
 ) and supply_id is null;

-- Любые ранее заведённые расходы по этим трём товарным партиям относятся
-- к одной общей поставке. Ничего не удаляется: batch_id остаётся в истории.
update public.financial_expenses expense
   set supply_id = batch.supply_id
  from public.inventory_batches batch
 where expense.batch_id = batch.id
   and batch.supply_id is not null
   and expense.supply_id is null;
