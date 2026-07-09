/**
 * Proves the core invariant: two simultaneous spend attempts on a bucket
 * that individually fit, but together exceed the balance, cannot both
 * succeed. Exactly one should succeed and one should be rejected.
 *
 * Run with: npm run test:concurrency
 * (requires schema.sql already applied and DATABASE_URL set in .env)
 */
require('dotenv').config();
const pool = require('../src/db');
const wallet = require('../src/services/walletService');

async function main() {
  const user = await pool.query(
    `insert into users (name, email) values ('Test User', 'concurrency-test-${Date.now()}@example.com') returning id`
  );
  const userId = user.rows[0].id;
  const createdWallet = await wallet.createWallet(userId);
  const bucket = await wallet.createBucket(createdWallet.id, { name: 'Test Bucket', type: 'general' });

  // Fund the bucket with 1000. Two spends of 700 each should NOT both succeed.
  await wallet.allocateDeposit(createdWallet.id, 1000, [{ bucketId: bucket.id, amount: 1000 }]);

  const results = await Promise.allSettled([
    wallet.spendFromBucket(bucket.id, 700, 'Spend A'),
    wallet.spendFromBucket(bucket.id, 700, 'Spend B'),
  ]);

  const succeeded = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  console.log(`Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log(`Rejected with: "${failed[0].reason.message}"`);
  }

  const { rows } = await pool.query('select balance from buckets where id = $1', [bucket.id]);
  console.log(`Final bucket balance: ${rows[0].balance} (should be 300, never negative)`);

  if (succeeded.length === 1 && failed.length === 1 && Number(rows[0].balance) === 300) {
    console.log('PASS: concurrency safety holds.');
  } else {
    console.log('FAIL: check your row-locking logic.');
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
