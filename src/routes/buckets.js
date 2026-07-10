const express = require('express');
const router = express.Router();
const wallet = require('../services/walletService');
const { checkAndSendReminders } = require('../services/reminderService');
const { createScheduledTransfer, runDueScheduledTransfers } = require('../services/scheduledTransferService');
const { setMonthlyLimit, checkBudgetAfterSpend, getNotificationsForWallet, markNotificationRead } = require('../services/budgetService');
const { setGoal, getGoalProgress } = require('../services/goalService');
const { addContribution, getContributions } = require('../services/sharedBucketService');

// Wrap async route handlers so thrown errors reach the error middleware
// instead of crashing the process.
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Every route below is mounted behind requireAuth in index.js, so
// req.userId is always set. Each handler confirms the wallet/bucket in
// the URL actually belongs to that user before touching it — otherwise
// any logged-in user could read or spend from anyone else's wallet just
// by guessing an id.

router.post('/wallets/:walletId/buckets', wrap(async (req, res) => {
  await wallet.assertWalletOwnership(req.params.walletId, req.userId);
  const created = await wallet.createBucket(req.params.walletId, req.body);
  res.status(201).json(created);
}));

router.get('/wallets/:walletId/buckets', wrap(async (req, res) => {
  await wallet.assertWalletOwnership(req.params.walletId, req.userId);
  const buckets = await wallet.getBucketsForWallet(req.params.walletId);
  res.json(buckets);
}));

router.post('/wallets/:walletId/deposit', wrap(async (req, res) => {
  await wallet.assertWalletOwnership(req.params.walletId, req.userId);
  const { amount, allocations } = req.body;
  await wallet.allocateDeposit(req.params.walletId, amount, allocations);
  const buckets = await wallet.getBucketsForWallet(req.params.walletId);
  res.json({ ok: true, buckets });
}));

router.post('/buckets/:bucketId/spend', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const { amount, note } = req.body;
  const result = await wallet.spendFromBucket(req.params.bucketId, amount, note);
  const budgetStatus = await checkBudgetAfterSpend(req.params.bucketId);
  res.json({ ...result, budgetStatus });
}));

router.post('/buckets/:bucketId/limit', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const { monthlyLimit } = req.body;
  const updated = await setMonthlyLimit(req.params.bucketId, monthlyLimit);
  res.json(updated);
}));

router.get('/wallets/:walletId/notifications', wrap(async (req, res) => {
  await wallet.assertWalletOwnership(req.params.walletId, req.userId);
  const notifications = await getNotificationsForWallet(req.params.walletId);
  res.json(notifications);
}));

router.post('/notifications/:notificationId/read', wrap(async (req, res) => {
  const updated = await markNotificationRead(req.params.notificationId, req.userId);
  res.json(updated);
}));

router.post('/buckets/:bucketId/goal', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const { goalAmount, goalDeadline } = req.body;
  const updated = await setGoal(req.params.bucketId, goalAmount, goalDeadline || null);
  res.json(updated);
}));

router.get('/buckets/:bucketId/goal-progress', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const progress = await getGoalProgress(req.params.bucketId);
  res.json(progress);
}));

router.post('/buckets/:bucketId/contributions', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const { contributorName, amount } = req.body;
  const contribution = await addContribution(req.params.bucketId, contributorName, amount);
  res.status(201).json(contribution);
}));

router.get('/buckets/:bucketId/contributions', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const contributions = await getContributions(req.params.bucketId);
  res.json(contributions);
}));

router.post('/buckets/:bucketId/transfer', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  await wallet.assertBucketOwnership(req.body.toBucketId, req.userId);
  const { toBucketId, amount } = req.body;
  const result = await wallet.transferBetweenBuckets(req.params.bucketId, toBucketId, amount);
  res.json(result);
}));

router.post('/buckets/:bucketId/lock', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const { lockUntil } = req.body;
  const updated = await wallet.setLock(req.params.bucketId, true, lockUntil || null);
  res.json(updated);
}));

router.post('/buckets/:bucketId/unlock', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const updated = await wallet.setLock(req.params.bucketId, false, null);
  res.json(updated);
}));

router.patch('/buckets/:bucketId', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const updated = await wallet.updateBucket(req.params.bucketId, req.body);
  res.json(updated);
}));

router.delete('/buckets/:bucketId', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const result = await wallet.deleteBucket(req.params.bucketId);
  res.json(result);
}));

router.get('/buckets/:bucketId/ledger', wrap(async (req, res) => {
  await wallet.assertBucketOwnership(req.params.bucketId, req.userId);
  const entries = await wallet.getLedgerForBucket(req.params.bucketId);
  res.json(entries);
}));

// Manually triggers the custodial reminder check across ALL wallets — this
// mirrors what the daily cron does globally, so it isn't scoped to one user.
router.post('/reminders/check', wrap(async (req, res) => {
  const count = await checkAndSendReminders();
  res.json({ remindersSent: count });
}));

router.post('/scheduled-transfers', wrap(async (req, res) => {
  const { fromBucketId, toBucketId, amount, frequency, nextRunAt } = req.body;
  await wallet.assertBucketOwnership(fromBucketId, req.userId);
  await wallet.assertBucketOwnership(toBucketId, req.userId);
  const created = await createScheduledTransfer(fromBucketId, toBucketId, amount, frequency, nextRunAt);
  res.status(201).json(created);
}));

// Manually trigger due scheduled transfers globally, for testing —
// same reasoning as /reminders/check above.
router.post('/scheduled-transfers/run', wrap(async (req, res) => {
  const count = await runDueScheduledTransfers();
  res.json({ transfersRun: count });
}));

module.exports = router;
