-- Vault schema: Week 1 core (wallets, buckets, ledger)
-- Run this once against your Postgres/Supabase database.

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  total_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint wallets_balance_nonnegative check (total_balance >= 0)
);

create table if not exists buckets (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  name text not null,
  type text not null default 'general', -- general | savings | locked | custodial | shared
  balance numeric(12,2) not null default 0,
  is_locked boolean not null default false,
  lock_until timestamptz,
  custodian_name text,        -- e.g. 'Rahul' for custodial buckets
  due_date timestamptz,       -- reminder date for custodial buckets
  color text,
  created_at timestamptz not null default now(),
  constraint buckets_balance_nonnegative check (balance >= 0)
);

-- Every deposit, spend, and transfer writes one or more rows here.
-- This table is append-only: never UPDATE or DELETE a row, only INSERT.
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  bucket_id uuid not null references buckets(id) on delete cascade,
  entry_type text not null, -- deposit | withdraw | transfer_in | transfer_out
  amount numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  counterparty_bucket_id uuid references buckets(id),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_buckets_wallet_id on buckets(wallet_id);
create index if not exists idx_ledger_bucket_id on ledger_entries(bucket_id);
create index if not exists idx_ledger_wallet_id on ledger_entries(wallet_id);
