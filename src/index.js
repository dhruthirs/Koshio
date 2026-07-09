require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bucketRoutes = require('./routes/buckets');
const { LedgerError } = require('./services/walletService');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/', bucketRoutes);

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
