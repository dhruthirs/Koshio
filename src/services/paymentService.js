const crypto = require('crypto');
const Razorpay = require('razorpay');
const pool = require('../db');
const { spendFromBucket, LedgerError } = require('./walletService');
const { checkBudgetAfterSpend } = require('./budgetService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Step 1 of a real payment: check the bucket can actually cover this spend
 * BEFORE we ever create a payment order. No point sending someone to pay
 * if their chosen bucket is locked or short — reject right here.
 */
async function createPaymentOrder(bucketId, amount, note) {
  const { rows } = await pool.query(`select * from buckets where id = $1`, [bucketId]);
  if (rows.length === 0) throw new LedgerError('Bucket not found.');
  const bucket = rows[0];

  if (bucket.is_locked) {
    throw new LedgerError('This bucket is locked. Unlock or transfer funds out before paying from it.');
  }
  if (Number(bucket.balance) < Number(amount)) {
    throw new LedgerError('Insufficient balance in this bucket.');
  }

  // amount is in rupees in our system; Razorpay expects the smallest unit (paise)
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    notes: { bucket_id: bucketId, note: note || '' },
  });

  await pool.query(
    `insert into payments (bucket_id, wallet_id, order_id, amount, status, note)
     values ($1, $2, $3, $4, 'pending', $5)`,
    [bucketId, bucket.wallet_id, order.id, amount, note || null]
  );

  return { orderId: order.id, amount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID };
}

/** Verifies that a webhook actually came from Razorpay, not an impersonator. */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expected === signatureHeader;
}

/**
 * Called once a webhook confirms a payment's outcome. This is the ONLY
 * place a bucket actually gets debited for a real payment — never at the
 * moment the user taps "pay," only once Razorpay's server confirms it.
 *
 * Idempotent: if this payment was already marked success (e.g. Razorpay
 * redelivers the same webhook, which it explicitly warns can happen),
 * we don't debit the bucket twice.
 */
async function handlePaymentOutcome(orderId, razorpayPaymentId, succeeded) {
  const { rows } = await pool.query(`select * from payments where order_id = $1`, [orderId]);
  if (rows.length === 0) {
    console.warn(`Webhook for unknown order_id: ${orderId}`);
    return;
  }
  const payment = rows[0];

  if (payment.status === 'success') {
    // Only a confirmed success is final. A retried order can go
    // pending -> failed -> success (user tried again with a different
    // method), so a prior 'failed' must NOT block a later success.
    return;
  }

  if (succeeded) {
    await spendFromBucket(payment.bucket_id, payment.amount, payment.note);
    await checkBudgetAfterSpend(payment.bucket_id);
    await pool.query(
      `update payments set status = 'success', razorpay_payment_id = $1, updated_at = now() where order_id = $2`,
      [razorpayPaymentId, orderId]
    );
  } else {
    await pool.query(
      `update payments set status = 'failed', updated_at = now() where order_id = $1`,
      [orderId]
    );
  }
}

module.exports = { createPaymentOrder, verifyWebhookSignature, handlePaymentOutcome };
