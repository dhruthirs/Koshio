const express = require('express');
const router = express.Router();
const { createPaymentOrder } = require('../services/paymentService');
const { assertBucketOwnership } = require('../services/walletService');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Mounted behind requireAuth in index.js — req.userId is set.
router.post('/buckets/:bucketId/create-payment-order', wrap(async (req, res) => {
  await assertBucketOwnership(req.params.bucketId, req.userId);
  const { amount, note } = req.body;
  const order = await createPaymentOrder(req.params.bucketId, amount, note);
  res.json(order);
}));

module.exports = router;
