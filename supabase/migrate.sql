-- ============================================================
-- Futures Edge AI — migration (safe to run multiple times)
-- Run this in Supabase SQL Editor on any existing database.
-- All statements use IF NOT EXISTS / OR REPLACE — no data loss.
-- ============================================================

-- ── 1. Trades table columns ──────────────────────────────────

alter table trades add column if not exists entry_price numeric(12,4);
alter table trades add column if not exists exit_price  numeric(12,4);

-- ── 2. Profiles table ────────────────────────────────────────

create table if not exists profiles (
  id                     uuid references auth.users primary key,
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text not null default 'inactive',
  is_pro                 boolean not null default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Add columns in case the table existed without them
alter table profiles add column if not exists is_pro               boolean not null default false;
alter table profiles add column if not exists stripe_customer_id   text;
alter table profiles add column if not exists stripe_subscription_id text;
alter table profiles add column if not exists subscription_status  text not null default 'inactive';

-- ── 3. RLS on profiles ───────────────────────────────────────

alter table profiles enable row level security;

drop policy if exists "Users can read own profile"   on profiles;
drop policy if exists "Service role can write profiles" on profiles;

-- Users can read their own profile (for subscription check)
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

-- ── 4. Auto-create profile on signup (CRITICAL) ──────────────
-- Without this trigger, new users have no profile row.
-- isSubscribed() returns false correctly, but the webhook upsert
-- is the only thing that creates the row — if Stripe is slow or
-- misconfigured, the user could be stuck in a broken state.
-- This trigger guarantees every user always has a row immediately.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- runs as the function owner, bypasses RLS
set search_path = public  -- prevents search path injection
as $$
begin
  insert into public.profiles (id, is_pro, subscription_status)
  values (new.id, false, 'inactive')
  on conflict (id) do nothing;  -- safe if row already exists
  return new;
end;
$$;

-- Drop and recreate so re-running this file is safe
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 5. Backfill existing users who have no profile row ───────
-- Inserts a default inactive row for every existing auth user
-- who doesn't already have one. Safe no-op if all rows exist.

insert into public.profiles (id, is_pro, subscription_status)
select id, false, 'inactive'
from auth.users
where id not in (select id from public.profiles);
