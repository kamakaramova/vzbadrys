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
