-- ============================================================
--  взБАДрись — создание таблицы товаров в Supabase
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

-- Журнал сервисных писем. Запись и чтение выполняются только сервером.
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  subject text not null,
  kind text not null,
  order_id text,
  dedupe_key text,
  provider_id text,
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

alter table public.email_logs enable row level security;

create unique index if not exists email_logs_sent_dedupe_idx
  on public.email_logs (dedupe_key)
  where dedupe_key is not null and status = 'sent';

create index if not exists email_logs_created_idx
  on public.email_logs (created_at desc);

-- Настройки способов доставки. Одна строка управляет тем, что видит покупатель.
-- Секреты служб доставки здесь не хранятся.
create table if not exists public.delivery_settings (
  id text primary key check (id = 'main'),
  enabled jsonb not null default '{"pickup": true, "sdek_pvz": true, "yandex_pvz": true, "ozon_pvz": true, "pochta": true}'::jsonb,
  pochta_widget_id integer not null default 62722 check (pochta_widget_id > 0),
  updated_at timestamptz not null default now()
);
alter table public.delivery_settings enable row level security;
insert into public.delivery_settings (id)
values ('main')
on conflict (id) do nothing;

-- OAuth-токены Ozon Доставки. Чтение и запись — только сервером;
-- из браузера доступ к ним невозможен.
create table if not exists public.oauth_connections (
  provider text primary key,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  updated_at timestamptz not null default now()
);
alter table public.oauth_connections enable row level security;

-- ============================================================
-- Программа лояльности: промокоды, рефералы, бонусы, отзывы
-- ============================================================

-- Промокоды магазина и блогеров. Управляются только через серверную админку.
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_name text,
  discount_percent integer not null check (discount_percent between 1 and 90),
  active boolean not null default true,
  max_uses integer check (max_uses is null or max_uses > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Для уже созданной таблицы (PostgreSQL безопасно пропустит повторное добавление).
alter table public.promo_codes add column if not exists owner_name text;
alter table public.promo_codes enable row level security;
create index if not exists promo_codes_active_idx on public.promo_codes (active, expires_at);

-- Дополняем заказ зафиксированными условиями скидки и бонусов.
alter table public.payment_orders add column if not exists referral_code text;
alter table public.payment_orders add column if not exists referral_owner_id text;
alter table public.payment_orders add column if not exists promo_discount_percent integer not null default 0;
alter table public.payment_orders add column if not exists referral_discount_percent integer not null default 0;
alter table public.payment_orders add column if not exists bonus_spent integer not null default 0;
alter table public.payment_orders add column if not exists bonus_discount_amount integer not null default 0;
create index if not exists payment_orders_referral_owner_idx on public.payment_orders (referral_owner_id, paid_at desc);

-- Каждая строка — прозрачное начисление или списание. Сумма в бонусах/рублях.
create table if not exists public.bonus_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  amount integer not null check (amount <> 0),
  kind text not null check (kind in ('order_reward', 'referral_reward', 'review_reward', 'order_payment')),
  order_id text references public.payment_orders(id) on delete set null,
  product_id text,
  status text not null default 'posted' check (status in ('reserved', 'posted', 'reversed')),
  created_at timestamptz not null default now(),
  unique (kind, order_id, product_id)
);
alter table public.bonus_ledger enable row level security;
create index if not exists bonus_ledger_user_idx on public.bonus_ledger (user_id, created_at desc);

-- Один человек получает реферальную награду только за первый оплаченный заказ друга.
create table if not exists public.referral_rewards (
  referred_user_id text primary key,
  referrer_user_id text not null,
  order_id text not null references public.payment_orders(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.referral_rewards enable row level security;
create index if not exists referral_rewards_referrer_idx on public.referral_rewards (referrer_user_id, created_at desc);

-- Отзывы оставляют только авторизованные покупатели через серверный API.
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  user_id text not null,
  order_id text not null references public.payment_orders(id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 3 and 3000),
  image_url text,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
alter table public.product_reviews enable row level security;
create index if not exists product_reviews_product_idx on public.product_reviews (product_id, created_at desc);

-- Модерация и ответ бренда. Старые отзывы остаются опубликованными.
alter table public.product_reviews add column if not exists author_email text;
alter table public.product_reviews add column if not exists answer text;
alter table public.product_reviews add column if not exists answered_at timestamptz;
alter table public.product_reviews add column if not exists is_published boolean;
update public.product_reviews set is_published = true where is_published is null;
alter table public.product_reviews alter column is_published set default true;
alter table public.product_reviews alter column is_published set not null;

-- Вопрос можно задать после входа; покупка для вопроса не требуется.
create table if not exists public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  user_id text not null,
  author_name text not null,
  body text not null check (char_length(body) between 3 and 1500),
  created_at timestamptz not null default now()
);
alter table public.product_questions enable row level security;
create index if not exists product_questions_product_idx on public.product_questions (product_id, created_at desc);

-- Вопрос может задать и гость: для ответа сохраняем имя и e-mail.
-- Новые вопросы появляются на карточке товара после ответа или ручной публикации в админке.
alter table public.product_questions alter column user_id drop not null;
alter table public.product_questions add column if not exists author_email text;
alter table public.product_questions add column if not exists answer text;
alter table public.product_questions add column if not exists answered_at timestamptz;
alter table public.product_questions add column if not exists is_published boolean;
update public.product_questions set is_published = true where is_published is null;
alter table public.product_questions alter column is_published set default false;
alter table public.product_questions alter column is_published set not null;

-- История ответов команды на отзывы и вопросы: правки не затирают предыдущий текст.
create table if not exists public.product_feedback_responses (
  id uuid primary key default gen_random_uuid(),
  feedback_type text not null check (feedback_type in ('review', 'question')),
  feedback_id uuid not null,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);
alter table public.product_feedback_responses enable row level security;
create index if not exists product_feedback_responses_feedback_idx
  on public.product_feedback_responses (feedback_type, feedback_id, created_at desc);

-- Необязательные фото отзывов. Загрузка выполняется сервером с секретным ключом.
insert into storage.buckets (id, name, public)
values ('review-media', 'review-media', true)
on conflict (id) do update set public = true;

-- Начальные промокоды из прежней версии сайта. Их можно отключить в админке.
insert into public.promo_codes (code, discount_percent)
values ('ВЗБАДРИСЬ10', 10), ('ВЗБАДРИСЬ15', 15), ('KAMA10', 10)
on conflict (code) do nothing;

-- Партионный склад вынесен в отдельные идемпотентные скрипты. Выполните по порядку:
-- infrastructure/inventory-phase-2.sql
-- infrastructure/inventory-batch-edit.sql
