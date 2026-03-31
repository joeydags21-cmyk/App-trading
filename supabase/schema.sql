-- ============================================================
-- Futures Edge AI — Supabase schema
-- Run this in Supabase SQL Editor for a FRESH setup.
-- If you already have a trades table, run migrate.sql instead.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Trades ───────────────────────────────────────────────────
create table if not exists trades (
  id          uuid        default uuid_generate_v4() primary key,
  user_id     uuid        references auth.users,
  date        text        not null,
  symbol      text        not null,
  direction   text        not null default 'long' check (direction in ('long', 'short')),
  pnl         numeric(12,2) not null,
  entry_price numeric(12,4),   -- optional
  exit_price  numeric(12,4),   -- optional
  notes       text,
  created_at  timestamptz default now()
);

-- ── Profiles (subscription state) ───────────────────────────
create table if not exists profiles (
  id                    uuid references auth.users primary key,
  stripe_customer_id    text,
  stripe_subscription_id text,
  subscription_status   text not null default 'inactive',
  is_pro                boolean not null default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
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

drop policy if exists "Users can manage own trades"   on trades;
drop policy if exists "Users can read own profile"    on profiles;
drop policy if exists "Users can manage own rules"    on rules;

create policy "Users can manage own trades" on trades
  for all using (auth.uid() = user_id);

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can manage own rules" on rules
  for all using (auth.uid() = user_id);
