const pool = require('../db');
const { LedgerError } = require('./walletService');

/**
 * Records a contribution from a specific person into a shared bucket.
 * This is real money entering the bucket (like a deposit), just tagged
 * with who it came from — so reuses the same atomic pattern as a deposit:
 * update bucket balance, update wallet total, write a ledger entry, all
 * in one transaction, plus a row in shared_contributions for the per-person
 * breakdown.
 */
async function addContribution(bucketId, contributorName, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `update buckets set balance = balance + $1 where id = $2 returning *`,
      [amount, bucketId]
    );
    if (rows.length === 0) throw new LedgerError('Bucket not found.');
    const bucket = rows[0];

    await client.query(
      `update wallets set total_balance = total_balance + $1 where id = $2`,
      [amount, bucket.wallet_id]
    );

    await client.query(
      `insert into ledger_entries (wallet_id, bucket_id, entry_type, amount, balance_after, note)
       values ($1, $2, 'deposit', $3, $4, $5)`,
      [bucket.wallet_id, bucketId, amount, bucket.balance, `Contribution from ${contributorName}`]
    );

    const { rows: contribRows } = await client.query(
      `insert into shared_contributions (bucket_id, contributor_name, amount)
       values ($1, $2, $3) returning *`,
      [bucketId, contributorName, amount]
    );

    await client.query('COMMIT');
    return contribRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Returns every contribution, plus a per-person total (who put in how much overall). */
async function getContributions(bucketId) {
  const { rows: entries } = await pool.query(
    `select * from shared_contributions where bucket_id = $1 order by created_at asc`,
    [bucketId]
  );

  const totalsByPerson = {};
  for (const entry of entries) {
    totalsByPerson[entry.contributor_name] =
      (totalsByPerson[entry.contributor_name] || 0) + Number(entry.amount);
  }

  return { entries, totalsByPerson };
}

module.exports = { addContribution, getContributions };
