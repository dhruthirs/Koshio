const pool = require('../db');

/**
 * Custom error so routes can tell "user did something invalid" (400)
 * apart from real server errors (500).
 */
class LedgerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LedgerError';
  }
}

/** Create a wallet for a user. One wallet per user is the assumed model. */
async function createWallet(userId) {
  const { rows } = await pool.query(
    `insert into wallets (user_id, total_balance) values ($1, 0) returning *`,
    [userId]
  );
  return rows[0];
}

/** Create a bucket (envelope) inside a wallet. Starts at zero balance. */
async function createBucket(walletId, { name, type = 'general', color = null, custodianName = null, dueDate = null }) {
  const { rows } = await pool.query(
    `insert into buckets (wallet_id, name, type, color, custodian_name, due_date)
     values ($1, $2, $3, $4, $5, $6) returning *`,
    [walletId, name, type, color, custodianName, dueDate]
  );
  return rows[0];
}

async function getBucketsForWallet(walletId) {
  const { rows } = await pool.query(
    `select * from buckets where wallet_id = $1 order by created_at asc`,
    [walletId]
  );
  return rows;
}

async function getLedgerForBucket(bucketId) {
  const { rows } = await pool.query(
    `select * from ledger_entries where bucket_id = $1 order by created_at desc`,
    [bucketId]
  );
  return rows;
}

/**
 * Deposit money into a wallet and split it across buckets in one atomic step.
 * allocations: [{ bucketId, amount }, ...] must sum exactly to `amount`.
 */
async function allocateDeposit(walletId, amount, allocations) {
  const allocatedSum = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
  if (Math.abs(allocatedSum - Number(amount)) > 0.001) {
    throw new LedgerError(
      `Allocations (${allocatedSum}) must sum exactly to the deposited amount (${amount}).`
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const alloc of allocations) {
      const { rows } = await client.query(
        `update buckets set balance = balance + $1
         where id = $2 and wallet_id = $3
         returning balance`,
        [alloc.amount, alloc.bucketId, walletId]
      );
      if (rows.length === 0) {
        throw new LedgerError(`Bucket ${alloc.bucketId} not found in this wallet.`);
      }

      await client.query(
        `insert into ledger_entries (wallet_id, bucket_id, entry_type, amount, balance_after, note)
         values ($1, $2, 'deposit', $3, $4, $5)`,
        [walletId, alloc.bucketId, alloc.amount, rows[0].balance, alloc.note || null]
      );
    }

    await client.query(
      `update wallets set total_balance = total_balance + $1 where id = $2`,
      [amount, walletId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Spend from a single bucket. Rejects if the bucket is locked or has
 * insufficient balance. This is the function the "pay" screen calls
 * AFTER a real payment (e.g. Razorpay webhook) has been confirmed —
 * never before, so the ledger never records money that didn't actually move.
 */
async function spendFromBucket(bucketId, amount, note = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // SELECT ... FOR UPDATE locks this row until COMMIT/ROLLBACK, so a
    // second simultaneous spend on the same bucket has to wait its turn
    // instead of reading a stale balance and overdrawing it.
    const { rows } = await client.query(
      `select * from buckets where id = $1 for update`,
      [bucketId]
    );
    if (rows.length === 0) throw new LedgerError('Bucket not found.');
    const bucket = rows[0];

    if (bucket.is_locked) {
      throw new LedgerError('This bucket is locked and cannot be spent from directly. Transfer it out first.');
    }
    if (Number(bucket.balance) < Number(amount)) {
      throw new LedgerError('Insufficient balance in this bucket.');
    }

    const newBalance = Number(bucket.balance) - Number(amount);
    await client.query(`update buckets set balance = $1 where id = $2`, [newBalance, bucketId]);
    await client.query(
      `update wallets set total_balance = total_balance - $1 where id = $2`,
      [amount, bucket.wallet_id]
    );
    await client.query(
      `insert into ledger_entries (wallet_id, bucket_id, entry_type, amount, balance_after, note)
       values ($1, $2, 'withdraw', $3, $4, $5)`,
      [bucket.wallet_id, bucketId, amount, newBalance, note]
    );

    await client.query('COMMIT');
    return { bucketId, newBalance };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Move money between two buckets in the same wallet.
 * Locks both rows in a fixed order (by id) so two transfers going in
 * opposite directions can never deadlock each other.
 */
async function transferBetweenBuckets(fromBucketId, toBucketId, amount) {
  if (fromBucketId === toBucketId) {
    throw new LedgerError('Cannot transfer a bucket to itself.');
  }

  const [firstId, secondId] = [fromBucketId, toBucketId].sort();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: locked } = await client.query(
      `select * from buckets where id in ($1, $2) order by id for update`,
      [firstId, secondId]
    );
    if (locked.length !== 2) throw new LedgerError('One or both buckets not found.');

    const from = locked.find(b => b.id === fromBucketId);
    const to = locked.find(b => b.id === toBucketId);

    if (from.is_locked) {
      throw new LedgerError('Source bucket is locked. Unlock it before transferring out.');
    }
    if (Number(from.balance) < Number(amount)) {
      throw new LedgerError('Insufficient balance in source bucket.');
    }

    const fromNewBalance = Number(from.balance) - Number(amount);
    const toNewBalance = Number(to.balance) + Number(amount);

    await client.query(`update buckets set balance = $1 where id = $2`, [fromNewBalance, from.id]);
    await client.query(`update buckets set balance = $1 where id = $2`, [toNewBalance, to.id]);

    const { rows: outRow } = await client.query(
      `insert into ledger_entries (wallet_id, bucket_id, entry_type, amount, balance_after, counterparty_bucket_id)
       values ($1, $2, 'transfer_out', $3, $4, $5) returning id`,
      [from.wallet_id, from.id, amount, fromNewBalance, to.id]
    );
    await client.query(
      `insert into ledger_entries (wallet_id, bucket_id, entry_type, amount, balance_after, counterparty_bucket_id)
       values ($1, $2, 'transfer_in', $3, $4, $5)`,
      [to.wallet_id, to.id, amount, toNewBalance, from.id]
    );

    await client.query('COMMIT');
    return { fromBucketId, toBucketId, fromNewBalance, toNewBalance, transferId: outRow[0].id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function setLock(bucketId, isLocked, lockUntil = null) {
  const { rows } = await pool.query(
    `update buckets set is_locked = $1, lock_until = $2 where id = $3 returning *`,
    [isLocked, lockUntil, bucketId]
  );
  if (rows.length === 0) throw new LedgerError('Bucket not found.');
  return rows[0];
}

module.exports = {
  LedgerError,
  createWallet,
  createBucket,
  getBucketsForWallet,
  getLedgerForBucket,
  allocateDeposit,
  spendFromBucket,
  transferBetweenBuckets,
  setLock,
};
