-- ============================================================
-- Futures Edge AI — full schema (FRESH setup only)
-- If you already have tables, run migrate.sql instead.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Trades ───────────────────────────────────────────────────
create table if not exists trades (
  id          uuid          default uuid_generate_v4() primary key,
  user_id     uuid          references auth.users,
  date        text          not null,
  symbol      text          not null,
  direction   text          not null default 'long' check (direction in ('long', 'short')),
  pnl         numeric(12,2) not null,
  entry_price numeric(12,4),
  exit_price  numeric(12,4),
  notes       text,
  created_at  timestamptz   default now()
);

-- ── Profiles (subscription state) ───────────────────────────
create table if not exists profiles (
  id                     uuid references auth.users primary key,
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text    not null default 'inactive',
  is_pro                 boolean not null default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ── Rules ────────────────────────────────────────────────────
create table if not exists rules (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references auth.users not null unique,
  max_trades_per_day  integer,
  max_loss_per_day    numeric(12,2),
  max_position_size   numeric(10,2),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── Row Level Security ───────────────────────────────────────
alter table trades   enable row level security;
alter table profiles enable row level security;
alter table rules    enable row level security;

drop policy if exists "Users can manage own trades" on trades;
drop policy if exists "Users can read own profile"  on profiles;
drop policy if exists "Users can manage own rules"  on rules;

create policy "Users can manage own trades" on trades
  for all using (auth.uid() = user_id);

-- Users can read their own profile (subscription check in app)
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can manage own rules" on rules
  for all using (auth.uid() = user_id);

-- ── Auto-create profile on signup ────────────────────────────
-- Guarantees every new user immediately has a profile row
-- with is_pro = false. Without this, new users have no row and
-- the webhook upsert is the only thing that creates it.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, is_pro, subscription_status)
  values (new.id, false, 'inactive')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
