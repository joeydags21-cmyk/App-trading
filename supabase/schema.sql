-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop existing tables (clears old schema — run only on fresh setup)
-- drop table if exists trades cascade;
-- drop table if exists rules cascade;

-- Trades table
create table if not exists trades (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  date text not null,
  symbol text not null,
  direction text not null default 'long' check (direction in ('long', 'short')),
  entry_price numeric(12,4),
  exit_price numeric(12,4),
  pnl numeric(12,2) not null,
  notes text,
  created_at timestamptz default now()
);

-- If the table already exists, add missing columns safely:
-- alter table trades add column if not exists entry_price numeric(12,4);
-- alter table trades add column if not exists exit_price numeric(12,4);

-- Profiles table (subscription state)
create table if not exists profiles (
  id uuid references auth.users primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text not null default 'inactive',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

-- Rules table
create table if not exists rules (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null unique,
  max_trades_per_day integer,
  max_loss_per_day numeric(12,2),
  max_position_size numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table trades enable row level security;
alter table rules enable row level security;

-- Drop existing policies before recreating (avoids duplicate policy error)
drop policy if exists "Users can manage own trades" on trades;
drop policy if exists "Users can manage own rules" on rules;

create policy "Users can manage own trades" on trades
  for all using (auth.uid() = user_id);

create policy "Users can manage own rules" on rules
  for all using (auth.uid() = user_id);
