-- ============================================================
-- Futures Edge AI — migration for EXISTING tables
-- Run this if you already have a trades table and are getting
-- errors about missing columns (entry_price, exit_price, etc.)
-- Safe to run multiple times — uses IF NOT EXISTS.
-- ============================================================

-- Add optional price columns to trades (safe if already exist)
alter table trades add column if not exists entry_price numeric(12,4);
alter table trades add column if not exists exit_price  numeric(12,4);

-- Add profiles table if it doesn't exist yet (for Stripe subscription state)
create table if not exists profiles (
  id                    uuid references auth.users primary key,
  stripe_customer_id    text,
  stripe_subscription_id text,
  subscription_status   text not null default 'inactive',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);
