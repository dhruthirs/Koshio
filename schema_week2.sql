-- Week 2 additions: run this AFTER schema.sql
-- Adds: a payments table (tracks real Razorpay orders and their outcome),
-- and a reminder_sent flag so custodial reminders don't repeat forever.

alter table buckets add column if not exists reminder_sent boolean not null default false;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  bucket_id uuid not null references buckets(id) on delete cascade,
  wallet_id uuid not null references wallets(id) on delete cascade,
  order_id text unique not null,        -- Razorpay order id
  razorpay_payment_id text,             -- filled in once payment is captured
  amount numeric(12,2) not null,
  status text not null default 'pending', -- pending | success | failed
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_order_id on payments(order_id);
create index if not exists idx_payments_bucket_id on payments(bucket_id);
