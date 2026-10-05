-- Дневник малыша: схема базы данных.
-- Выполните этот файл один раз в Supabase: SQL Editor → New query → Run.

create table if not exists public.feedings (
  id uuid primary key default gen_random_uuid(),
  fed_at timestamptz not null default now(),
  amount_ml integer not null check (amount_ml > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.toilets (
  id uuid primary key default gen_random_uuid(),
  happened_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.sleeps (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at)
);

create index if not exists feedings_fed_at_idx on public.feedings (fed_at desc);
create index if not exists toilets_happened_at_idx on public.toilets (happened_at desc);
create index if not exists sleeps_started_at_idx on public.sleeps (started_at desc);

-- Приложение работает без авторизации, поэтому доступ открыт для публичного ключа.
grant select, insert, update, delete on public.feedings, public.toilets, public.sleeps
  to anon, authenticated;

alter table public.feedings enable row level security;
alter table public.toilets enable row level security;
alter table public.sleeps enable row level security;

drop policy if exists "public access" on public.feedings;
create policy "public access" on public.feedings
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "public access" on public.toilets;
create policy "public access" on public.toilets
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "public access" on public.sleeps;
create policy "public access" on public.sleeps
  for all to anon, authenticated using (true) with check (true);
