require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const bucketRoutes = require('./routes/buckets');
const paymentRoutes = require('./routes/payments');
const { LedgerError } = require('./services/walletService');
const { checkAndSendReminders } = require('./services/reminderService');

const app = express();
app.use(cors());

// The webhook route needs the raw request body (as bytes) to verify
// Razorpay's signature. This raw parser is scoped ONLY to that path.
// express.json() below checks whether a body was already parsed and
// skips re-parsing if so, so this ordering is safe for every other route.
app.use('/webhooks/razorpay', express.raw({ type: 'application/json' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/', bucketRoutes);
app.use('/', paymentRoutes);

// Central error handler: LedgerError means the request itself was invalid
// (locked bucket, insufficient balance, bad allocation) -> 400.
// Anything else is a real bug -> 500.
app.use((err, req, res, next) => {
  if (err instanceof LedgerError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Vault API running on http://localhost:${PORT}`));

// Runs every day at 9:00 AM server time — checks for custodial buckets
// (e.g. "Rahul's money") whose due date is within 24 hours and reminds once.
cron.schedule('0 9 * * *', () => {
  checkAndSendReminders().catch(err => console.error('Reminder job failed:', err));
});
