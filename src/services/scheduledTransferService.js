const pool = require('../db');
const { transferBetweenBuckets } = require('./walletService');

async function createScheduledTransfer(fromBucketId, toBucketId, amount, frequency, nextRunAt) {
  const { rows } = await pool.query(
    `insert into scheduled_transfers (from_bucket_id, to_bucket_id, amount, frequency, next_run_at)
     values ($1, $2, $3, $4, $5) returning *`,
    [fromBucketId, toBucketId, amount, frequency, nextRunAt]
  );
  return rows[0];
}

function computeNextRun(current, frequency) {
  const next = new Date(current);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  else throw new Error(`Unknown frequency: ${frequency}`);
  return next;
}

/**
 * Finds every active scheduled transfer whose next_run_at has arrived,
 * runs it through the same transferBetweenBuckets() used for manual
 * transfers, and advances next_run_at to the following occurrence.
 * A transfer that fails (e.g. insufficient balance that cycle) is logged
 * and left for the next scheduled run rather than crashing the whole job.
 */
async function runDueScheduledTransfers() {
  const { rows: due } = await pool.query(
    `select * from scheduled_transfers where is_active = true and next_run_at <= now()`
  );

  let ranCount = 0;
  for (const t of due) {
    try {
      await transferBetweenBuckets(t.from_bucket_id, t.to_bucket_id, t.amount);
      ranCount++;
    } catch (err) {
      console.error(`Scheduled transfer ${t.id} failed this cycle: ${err.message}`);
    }
    const nextRun = computeNextRun(t.next_run_at, t.frequency);
    await pool.query(`update scheduled_transfers set next_run_at = $1 where id = $2`, [nextRun, t.id]);
  }
  return ranCount;
}

module.exports = { createScheduledTransfer, runDueScheduledTransfers };
