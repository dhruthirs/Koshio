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
- **Custodial buckets** — hold money on behalf of someone else, with an
  automatic daily reminder job (plus a manual trigger endpoint for testing)
  that fires once per due bucket and never repeats once sent
- **Transfers between buckets** — atomic, with consistent lock ordering to
  avoid deadlocks
- **Full transaction history** — every deposit, spend, and transfer writes
  an immutable row to the ledger
- **Real payments via Razorpay** — creates a sandbox order, opens checkout,
  and only debits the chosen bucket once Razorpay's webhook server-confirms
  the payment; idempotent against retried/duplicate webhook deliveries so a
  failed attempt followed by a successful retry on the same order still
  debits correctly exactly once
- **Scheduled transfers** — recurring automatic transfers between buckets
  (daily/weekly/monthly), run by a daily cron job reusing the same atomic
  transfer logic as manual transfers
- **Budget limits + overspend alerts** — set a monthly spending limit per
  bucket; every spend (manual or webhook-confirmed) checks month-to-date
  totals against it and logs a notification if crossed
- **Savings goals** — set a target amount and deadline on any bucket; a
  progress endpoint computes percent complete, amount remaining, and days
  left, purely from stored data
- **Shared buckets** — track per-person contributions into a trip/event
  bucket; each contribution atomically updates the bucket and wallet
  balance and is attributed to the contributor by name

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
POST /reminders/check                  manually trigger custodial reminder check
POST /buckets/:id/create-payment-order create a real Razorpay sandbox payment order
POST /webhooks/razorpay                Razorpay's server-to-server payment confirmation
POST /scheduled-transfers              create a recurring transfer rule
POST /scheduled-transfers/run          manually run due scheduled transfers
POST /buckets/:id/limit                set or clear a bucket's monthly spending limit
GET  /wallets/:id/notifications        list overspend/other alerts for a wallet
POST /buckets/:id/goal                 set a savings goal (amount + deadline) on a bucket
GET  /buckets/:id/goal-progress        percent complete, remaining amount, days left
POST /buckets/:id/contributions        record a named contribution into a shared bucket
GET  /buckets/:id/contributions        list contributions and per-person totals
```

## Testing real payments locally

Razorpay needs a public URL to send webhook confirmations to, so local
testing requires a tunnel:

1. Run `ngrok http 4000` in a separate terminal — copy the `https://...
   ngrok-free.dev` URL it prints (this changes every time you restart ngrok,
   on the free tier)
2. In Razorpay dashboard → Settings → Webhooks, set the webhook URL to
   `https://YOUR-NGROK-URL/webhooks/razorpay`, with events `payment.captured`
   and `payment.failed`, and a secret matching `RAZORPAY_WEBHOOK_SECRET` in
   your `.env`
3. Open `test-payment.html` directly in a browser (no server needed for this
   file itself) — enter a bucket id and amount, click Pay
4. In the checkout popup, use **Netbanking → pick any bank → Success** —
   this is the most reliable test path; card test numbers can behave
   inconsistently on unactivated sandbox accounts
5. Check the bucket's balance afterward to confirm the webhook-confirmed
   debit actually happened

## Roadmap

- Frontend dashboard
