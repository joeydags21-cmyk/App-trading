-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Trades table
create table trades (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  date text not null,
  symbol text not null,
  direction text not null default 'long' check (direction in ('long', 'short')),
  pnl numeric(12,2) not null,
  notes text,
  created_at timestamptz default now()
);

-- Rules table
create table rules (
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

create policy "Users can manage own trades" on trades
  for all using (auth.uid() = user_id);

create policy "Users can manage own rules" on rules
  for all using (auth.uid() = user_id);
