const pool = require('../db');

async function setGoal(bucketId, goalAmount, goalDeadline) {
  const { rows } = await pool.query(
    `update buckets set goal_amount = $1, goal_deadline = $2 where id = $3 returning *`,
    [goalAmount, goalDeadline, bucketId]
  );
  return rows[0];
}

/**
 * Returns progress as a percentage, plus how many days remain until the
 * deadline (if one is set). Pure arithmetic on data we already have —
 * no external calls, no AI, just balance / goal_amount.
 */
async function getGoalProgress(bucketId) {
  const { rows } = await pool.query(`select * from buckets where id = $1`, [bucketId]);
  const bucket = rows[0];
  if (!bucket) return null;
  if (bucket.goal_amount === null) {
    return { hasGoal: false };
  }

  const balance = Number(bucket.balance);
  const goalAmount = Number(bucket.goal_amount);
  const percentComplete = goalAmount > 0 ? Math.min(100, (balance / goalAmount) * 100) : 0;

  let daysRemaining = null;
  if (bucket.goal_deadline) {
    const msRemaining = new Date(bucket.goal_deadline).getTime() - Date.now();
    daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  }

  return {
    hasGoal: true,
    balance,
    goalAmount,
    percentComplete: Math.round(percentComplete * 10) / 10,
    remainingAmount: Math.max(0, goalAmount - balance),
    daysRemaining,
    deadline: bucket.goal_deadline,
  };
}

module.exports = { setGoal, getGoalProgress };
