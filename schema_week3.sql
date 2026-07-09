-- Week 3 additions: run this AFTER schema.sql and schema_week2.sql

create table if not exists scheduled_transfers (
  id uuid primary key default gen_random_uuid(),
  from_bucket_id uuid not null references buckets(id) on delete cascade,
  to_bucket_id uuid not null references buckets(id) on delete cascade,
  amount numeric(12,2) not null,
  frequency text not null, -- 'daily' | 'weekly' | 'monthly'
  next_run_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table buckets add column if not exists monthly_limit numeric(12,2);
alter table buckets add column if not exists goal_amount numeric(12,2);
alter table buckets add column if not exists goal_deadline timestamptz;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  bucket_id uuid references buckets(id) on delete cascade,
  type text not null, -- 'overspend' | 'custodial_due' | etc
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists shared_contributions (
  id uuid primary key default gen_random_uuid(),
  bucket_id uuid not null references buckets(id) on delete cascade,
  contributor_name text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_scheduled_transfers_next_run on scheduled_transfers(next_run_at) where is_active = true;
create index if not exists idx_notifications_wallet on notifications(wallet_id);
create index if not exists idx_shared_contributions_bucket on shared_contributions(bucket_id);
