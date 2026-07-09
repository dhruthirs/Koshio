# Koshio — Virtual Money Vault Engine

A backend that lets you split one real account balance into purpose-based
buckets (envelopes) — rent, savings, trip funds, money you're holding for a
friend — instead of seeing one undifferentiated number. Every bucket has its
own tracked balance, but they're all backed by a single atomic ledger, so the
totals can never drift out of sync.

## Why this exists

Most payment apps (Google Pay, PhonePe, etc.) only show you one balance.
There's no way to mentally or functionally separate "rent money" from
"spending money" from "money my friend asked me to hold" — you just have to
remember. Koshio adds that separation as a real, enforced layer: locked
buckets can't be spent from at checkout, custodial buckets track who the
money belongs to and remind you when it's due back, and every transaction is
recorded in an append-only ledger.

## Core features

- **Bucket-based allocation** — split any incoming deposit across buckets in
  one atomic step; allocations must sum exactly to the deposit
- **Concurrency-safe spending** — row-level locking (`SELECT ... FOR UPDATE`)
  ensures two simultaneous spends on the same bucket can never both succeed
  if only one can be covered by the balance
- **Locked buckets** — a locked bucket is excluded from the spend flow
  entirely; the only way to use that money is to explicitly transfer it out
  first, a separate deliberate action
- **Custodial buckets** — hold money on behalf of someone else, with a
  due-date reminder job
- **Transfers between buckets** — atomic, with consistent lock ordering to
  avoid deadlocks
- **Full transaction history** — every deposit, spend, and transfer writes
  an immutable row to the ledger

## Architecture

- **Database:** PostgreSQL (hosted on Supabase) — chosen specifically for
  real transactional guarantees and row-level locking
- **Backend:** Node.js + Express
- **Core invariant:** `wallet.total_balance` always equals the sum of every
  bucket's balance under it; every operation updates both sides inside a
  single database transaction

## Setup

### 1. Get a Postgres database

Create a free project at https://supabase.com. Once it's ready, go to
**Connect** (top of the dashboard) and copy the **Session pooler** connection
string (the direct connection host often fails to resolve over IPv6 on some
networks — the pooler avoids that).

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your real `DATABASE_URL`. Note:
if your password contains special characters like `@`, they must be
URL-encoded (`@` becomes `%40`).

### 4. Apply the schema

```bash
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -f schema_week2.sql
```

(Or paste both files into Supabase's SQL Editor and run them.)

### 5. Run the server

```bash
npm run dev
```

Check it's alive: `curl http://localhost:4000/health`

## Proving correctness

```bash
npm run test:concurrency
```

This fires two simultaneous spend attempts at a bucket that individually fit
but together exceed its balance. Exactly one should succeed and one should be
rejected, with the final balance never going negative — proving the
row-locking actually prevents a double-spend under a real race condition.

## API overview

```
POST /wallets                          create a wallet
POST /wallets/:id/buckets              create a bucket
GET  /wallets/:id/buckets              list buckets in a wallet
POST /wallets/:id/deposit              deposit + allocate across buckets
POST /buckets/:id/spend                spend from a bucket
POST /buckets/:id/transfer             transfer between buckets
POST /buckets/:id/lock                 lock a bucket (excludes it from spend)
POST /buckets/:id/unlock               unlock a bucket
GET  /buckets/:id/ledger               transaction history for a bucket
```

## Roadmap

- Real payments via Razorpay sandbox (order creation + webhook-confirmed
  spend, so a bucket is only debited once payment is server-confirmed)
- Scheduled/recurring transfers
- Budget limits with overspend alerts
- Shared buckets for trips/events with per-person contribution tracking
- Frontend dashboard
