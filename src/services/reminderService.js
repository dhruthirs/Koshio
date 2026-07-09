const pool = require('../db');

/**
 * Finds custodial buckets whose due_date is within the next 24 hours
 * and haven't been reminded yet, then "sends" a reminder.
 *
 * Right now this just logs to the console — in a real deployment you'd
 * swap the console.log for an email (e.g. via Resend/SendGrid) or a push
 * notification. The detection logic itself doesn't change either way.
 */
async function checkAndSendReminders() {
  const { rows } = await pool.query(
    `select id, name, custodian_name, due_date, balance
     from buckets
     where type = 'custodial'
       and reminder_sent = false
       and due_date is not null
       and due_date <= now() + interval '1 day'`
  );

  for (const bucket of rows) {
    console.log(
      `[REMINDER] "${bucket.name}" holding ₹${bucket.balance} for ${bucket.custodian_name} ` +
      `is due back on ${bucket.due_date}.`
    );
    await pool.query(`update buckets set reminder_sent = true where id = $1`, [bucket.id]);
  }

  return rows.length;
}

module.exports = { checkAndSendReminders };
