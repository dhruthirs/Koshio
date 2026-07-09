const express = require('express');
const router = express.Router();
const { createPaymentOrder, verifyWebhookSignature, handlePaymentOutcome } = require('../services/paymentService');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Creates a Razorpay order for a specific bucket. Call this when the user
// taps "pay" and has chosen which bucket to pay from. Returns the orderId
// and keyId the frontend needs to open Razorpay's checkout widget.
router.post('/buckets/:bucketId/create-payment-order', wrap(async (req, res) => {
  const { amount, note } = req.body;
  const order = await createPaymentOrder(req.params.bucketId, amount, note);
  res.json(order);
}));

// Razorpay calls this URL directly (server to server) once a payment's
// outcome is known. Note: this route needs the RAW request body to verify
// the signature, so it's mounted with express.raw() in index.js, BEFORE
// the global express.json() middleware.
router.post('/webhooks/razorpay', wrap(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const isValid = verifyWebhookSignature(req.body, signature);

  if (!isValid) {
    console.warn('Rejected webhook with invalid signature.');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(req.body.toString());
  const event = payload.event;

  if (event === 'payment.captured') {
    const orderId = payload.payload.payment.entity.order_id;
    const paymentId = payload.payload.payment.entity.id;
    await handlePaymentOutcome(orderId, paymentId, true);
  } else if (event === 'payment.failed') {
    const orderId = payload.payload.payment.entity.order_id;
    await handlePaymentOutcome(orderId, null, false);
  }

  // Always respond 200 quickly once processed — Razorpay retries on
  // non-200 responses, so we don't want to fail this due to something
  // unrelated further down the line.
  res.status(200).json({ received: true });
}));

module.exports = router;
