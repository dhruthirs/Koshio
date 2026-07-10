const pool = require('../db');
const { LedgerError } = require('./walletService');

/** Sets or clears a bucket's monthly spending limit. Pass null to remove it. */
async function setMonthlyLimit(bucketId, monthlyLimit) {
  const { rows } = await pool.query(
    `update buckets set monthly_limit = $1 where id = $2 returning *`,
    [monthlyLimit, bucketId]
  );
  return rows[0];
}

/**
 * Called after a successful spend. Sums this calendar month's withdrawals
 * from the ledger for this bucket and compares against monthly_limit.
 * If it's been crossed, writes a notification (once per check — if you
 * spend again while already over, you'll get another one, which is fine:
 * that's actually useful, not a bug, since it's a fresh overspend event).
 */
async function checkBudgetAfterSpend(bucketId) {
  const { rows: bucketRows } = await pool.query(`select * from buckets where id = $1`, [bucketId]);
  const bucket = bucketRows[0];
  if (!bucket || bucket.monthly_limit === null) return null; // no limit set, nothing to check

  const { rows: sumRows } = await pool.query(
    `select coalesce(sum(amount), 0) as spent
     from ledger_entries
     where bucket_id = $1
       and entry_type = 'withdraw'
       and created_at >= date_trunc('month', now())`,
    [bucketId]
  );
  const spentThisMonth = Number(sumRows[0].spent);

  if (spentThisMonth > Number(bucket.monthly_limit)) {
    const message = `"${bucket.name}" has spent ₹${spentThisMonth} this month, over its ₹${bucket.monthly_limit} limit.`;
    await pool.query(
      `insert into notifications (wallet_id, bucket_id, type, message) values ($1, $2, 'overspend', $3)`,
      [bucket.wallet_id, bucket.id, message]
    );
    return { overspent: true, spentThisMonth, limit: Number(bucket.monthly_limit), message };
  }
  return { overspent: false, spentThisMonth, limit: Number(bucket.monthly_limit) };
}

async function getNotificationsForWallet(walletId) {
  const { rows } = await pool.query(
    `select * from notifications where wallet_id = $1 order by created_at desc`,
    [walletId]
  );
  return rows;
}

async function markNotificationRead(notificationId, userId) {
  const { rows } = await pool.query(
    `update notifications n set is_read = true
     from wallets w
     where n.id = $1 and n.wallet_id = w.id and w.user_id = $2
     returning n.*`,
    [notificationId, userId]
  );
  if (rows.length === 0) throw new LedgerError('Notification not found.');
  return rows[0];
}

module.exports = { setMonthlyLimit, checkBudgetAfterSpend, getNotificationsForWallet, markNotificationRead };
