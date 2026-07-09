# Vault — Week 1: Ledger Core

A virtual money-vault backend: one real wallet balance, split into buckets
(envelopes), with an atomic, concurrency-safe ledger underneath.

## What's in this week's build

- `schema.sql` — Postgres tables: `users`, `wallets`, `buckets`, `ledger_entries`
- `src/services/walletService.js` — the actual engine: deposit/allocate,
  spend, transfer, lock/unlock — all transactional with row-level locking
- `src/routes/buckets.js` + `src/index.js` — Express API wrapping the engine
- `scripts/testConcurrency.js` — proves two simultaneous spends can't overdraw
  a bucket

## 1. Get a Postgres database (2 minutes, no local install needed)

1. Go to https://supabase.com, create a free account and a new project
2. Once it's ready: **Project Settings → Database → Connection string → URI**
3. Copy that string — you'll paste it into `.env` in step 3 below

(You can use local Postgres instead if you already have it installed —
just put your local connection string in `.env` and skip Supabase.)

## 2. Install dependencies

```bash
cd vault-project
npm install
```

## 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and paste your real `DATABASE_URL` from Supabase.

## 4. Apply the schema

Using `psql`:
```bash
psql "$DATABASE_URL" -f schema.sql
```

Or paste the contents of `schema.sql` into Supabase's **SQL Editor** and run it.

## 5. Run the server

```bash
npm run dev
```

You should see `Vault API running on http://localhost:4000`.
Check it's alive: `curl http://localhost:4000/health`

## 6. Try it end to end with curl

```bash
# Create a user directly in the DB for now (auth comes later)
psql "$DATABASE_URL" -c "insert into users (name, email) values ('You', 'you@example.com') returning id;"
# copy the returned id into USER_ID below

USER_ID="paste-the-id-here"

# Create a wallet
curl -X POST localhost:4000/wallets -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\"}"
# copy the returned wallet id

WALLET_ID="paste-wallet-id-here"

# Create two buckets
curl -X POST localhost:4000/wallets/$WALLET_ID/buckets -H "Content-Type: application/json" \
  -d '{"name": "Food", "type": "general", "color": "green"}'
curl -X POST localhost:4000/wallets/$WALLET_ID/buckets -H "Content-Type: application/json" \
  -d '{"name": "Savings", "type": "savings", "color": "blue"}'
# copy both bucket ids

# Deposit 5000 and split it across both buckets
curl -X POST localhost:4000/wallets/$WALLET_ID/deposit -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "allocations": [
      { "bucketId": "FOOD_BUCKET_ID", "amount": 3000 },
      { "bucketId": "SAVINGS_BUCKET_ID", "amount": 2000 }
    ]
  }'

# Spend from Food
curl -X POST localhost:4000/buckets/FOOD_BUCKET_ID/spend -H "Content-Type: application/json" \
  -d '{"amount": 500, "note": "groceries"}'

# Lock Savings, then try to spend from it (should be rejected)
curl -X POST localhost:4000/buckets/SAVINGS_BUCKET_ID/lock -H "Content-Type: application/json" -d '{}'
curl -X POST localhost:4000/buckets/SAVINGS_BUCKET_ID/spend -H "Content-Type: application/json" \
  -d '{"amount": 100}'
# -> 400 "This bucket is locked and cannot be spent from directly."

# See transaction history
curl localhost:4000/buckets/FOOD_BUCKET_ID/ledger
```

## 7. Prove the core invariant holds under concurrency

```bash
npm run test:concurrency
```

Expected output ends with `PASS: concurrency safety holds.` — two
simultaneous spends of 700 each on a bucket holding 1000 should result in
exactly one success, one rejection, and a final balance of 300 (never
negative, never double-spent).

## What to build next (Week 2)

- `is_locked` + explicit unlock is already here — next add custodial buckets
  (`custodian_name`, `due_date`) with a reminder job
- Real payments: Razorpay sandbox order creation + webhook that calls
  `spendFromBucket` only after payment is server-confirmed
