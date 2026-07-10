const express = require('express');
const router = express.Router();
const { verifyWebhookSignature, handlePaymentOutcome } = require('../services/paymentService');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Razorpay calls this directly, server to server — there is no logged-in
// user here, so this route is intentionally NOT behind requireAuth.
// Trust is established instead via the signature check below.
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

  res.status(200).json({ received: true });
}));

module.exports = router;
