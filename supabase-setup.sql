-- ============================================================
--  Взбадрись — создание таблицы товаров в Supabase
--  Вставь весь этот код в Supabase → SQL Editor → Run
-- ============================================================

-- Таблица товаров. Весь товар хранится в поле data (JSON).
create table if not exists public.products (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Включаем защиту доступа
alter table public.products enable row level security;

-- Разрешаем всем ЧИТАТЬ товары (для сайта).
-- Запись возможна только с секретным ключом (через сервер) — она обходит эту защиту.
drop policy if exists "public read products" on public.products;
create policy "public read products"
  on public.products
  for select
  using (true);

-- Платежные заказы Ozon. Доступ к таблице есть только у серверного
-- service-role ключа; из браузера покупателя таблица недоступна.
create table if not exists public.payment_orders (
  id text primary key,
  ozon_order_id text unique,
  ozon_pay_link text,
  status text not null default 'pending',
  amount_kopecks bigint not null check (amount_kopecks > 0),
  currency_code text not null default '643',
  is_test boolean,
  payment_method text,
  customer jsonb not null,
  items jsonb not null,
  delivery jsonb not null,
  promo_code text,
  comment text,
  user_id text,
  agreement_accepted_at timestamptz not null,
  offer_version text not null,
  stock_written_off boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_orders enable row level security;

create index if not exists payment_orders_status_idx
  on public.payment_orders (status, created_at desc);
