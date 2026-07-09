const express = require('express');
const router = express.Router();
const wallet = require('../services/walletService');
const { checkAndSendReminders } = require('../services/reminderService');
const { createScheduledTransfer, runDueScheduledTransfers } = require('../services/scheduledTransferService');
const { setMonthlyLimit, checkBudgetAfterSpend, getNotificationsForWallet } = require('../services/budgetService');
const { setGoal, getGoalProgress } = require('../services/goalService');

// Wrap async route handlers so thrown errors reach the error middleware
// instead of crashing the process.
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.post('/wallets', wrap(async (req, res) => {
  const { userId } = req.body;
  const created = await wallet.createWallet(userId);
  res.status(201).json(created);
}));

router.post('/wallets/:walletId/buckets', wrap(async (req, res) => {
  const created = await wallet.createBucket(req.params.walletId, req.body);
  res.status(201).json(created);
}));

router.get('/wallets/:walletId/buckets', wrap(async (req, res) => {
  const buckets = await wallet.getBucketsForWallet(req.params.walletId);
  res.json(buckets);
}));

router.post('/wallets/:walletId/deposit', wrap(async (req, res) => {
  const { amount, allocations } = req.body;
  await wallet.allocateDeposit(req.params.walletId, amount, allocations);
  const buckets = await wallet.getBucketsForWallet(req.params.walletId);
  res.json({ ok: true, buckets });
}));

router.post('/buckets/:bucketId/spend', wrap(async (req, res) => {
  const { amount, note } = req.body;
  const result = await wallet.spendFromBucket(req.params.bucketId, amount, note);
  const budgetStatus = await checkBudgetAfterSpend(req.params.bucketId);
  res.json({ ...result, budgetStatus });
}));

router.post('/buckets/:bucketId/limit', wrap(async (req, res) => {
  const { monthlyLimit } = req.body;
  const updated = await setMonthlyLimit(req.params.bucketId, monthlyLimit);
  res.json(updated);
}));

router.get('/wallets/:walletId/notifications', wrap(async (req, res) => {
  const notifications = await getNotificationsForWallet(req.params.walletId);
  res.json(notifications);
}));

router.post('/buckets/:bucketId/goal', wrap(async (req, res) => {
  const { goalAmount, goalDeadline } = req.body;
  const updated = await setGoal(req.params.bucketId, goalAmount, goalDeadline || null);
  res.json(updated);
}));

router.get('/buckets/:bucketId/goal-progress', wrap(async (req, res) => {
  const progress = await getGoalProgress(req.params.bucketId);
  res.json(progress);
}));

router.post('/buckets/:bucketId/transfer', wrap(async (req, res) => {
  const { toBucketId, amount } = req.body;
  const result = await wallet.transferBetweenBuckets(req.params.bucketId, toBucketId, amount);
  res.json(result);
}));

router.post('/buckets/:bucketId/lock', wrap(async (req, res) => {
  const { lockUntil } = req.body;
  const updated = await wallet.setLock(req.params.bucketId, true, lockUntil || null);
  res.json(updated);
}));

router.post('/buckets/:bucketId/unlock', wrap(async (req, res) => {
  const updated = await wallet.setLock(req.params.bucketId, false, null);
  res.json(updated);
}));

router.get('/buckets/:bucketId/ledger', wrap(async (req, res) => {
  const entries = await wallet.getLedgerForBucket(req.params.bucketId);
  res.json(entries);
}));

// Manually triggers the custodial reminder check. In production this
// also runs automatically once a day via the cron job in index.js —
// this route exists so you can test it on demand without waiting.
router.post('/reminders/check', wrap(async (req, res) => {
  const count = await checkAndSendReminders();
  res.json({ remindersSent: count });
}));

router.post('/scheduled-transfers', wrap(async (req, res) => {
  const { fromBucketId, toBucketId, amount, frequency, nextRunAt } = req.body;
  const created = await createScheduledTransfer(fromBucketId, toBucketId, amount, frequency, nextRunAt);
  res.status(201).json(created);
}));

// Manually trigger due scheduled transfers, for testing without waiting
// for the automatic daily cron in index.js.
router.post('/scheduled-transfers/run', wrap(async (req, res) => {
  const count = await runDueScheduledTransfers();
  res.json({ transfersRun: count });
}));

module.exports = router;
