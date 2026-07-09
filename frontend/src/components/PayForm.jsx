import React, { useState } from 'react';
import { api } from '../api';

export default function PayForm({ buckets, onDone }) {
  const spendable = buckets.filter((b) => !b.is_locked);
  const [mode, setMode] = useState('razorpay'); // 'razorpay' | 'manual'
  const [bucketId, setBucketId] = useState(spendable[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function submitManual(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    setBusy(true);
    try {
      const res = await api.spend(bucketId, { amount: Number(amount), note });
      if (res.budgetStatus?.overspent) {
        setStatus('Logged. Over this bucket\'s monthly limit — an alert was recorded.');
      } else {
        setStatus('Logged.');
      }
      setAmount('');
      setNote('');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitRazorpay(e) {
    e.preventDefault();
    setError('');
    setStatus('');

    if (!window.Razorpay) {
      setError('Razorpay checkout script did not load. Check your internet connection and reload.');
      return;
    }

    setBusy(true);
    try {
      const order = await api.createPaymentOrder(bucketId, { amount: Number(amount), note });

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(Number(amount) * 100),
        currency: 'INR',
        name: 'Koshio',
        description: note || 'Payment',
        order_id: order.orderId,
        handler: () => {
          setStatus('Payment submitted — the bucket updates once the payment is confirmed (usually a few seconds).');
          setAmount('');
          setNote('');
          setTimeout(onDone, 3000);
        },
        theme: { color: '#C89B3C' },
      });

      rzp.on('payment.failed', () => {
        setError('Payment failed or was cancelled. Nothing was deducted.');
      });

      rzp.open();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-inkSoft rounded-xl p-6 max-w-lg">
      <h3 className="font-display text-xl text-parchment mb-1">Pay from a bucket</h3>
      <p className="font-body text-xs text-parchment/40 mb-4">
        Locked buckets aren't shown here — unlock or transfer out first.
      </p>

      <div className="flex gap-2 mb-5 bg-ink rounded-md p-1">
        <button
          type="button"
          onClick={() => setMode('razorpay')}
          className={`flex-1 font-body text-sm py-1.5 rounded transition ${
            mode === 'razorpay' ? 'bg-brass text-ink font-semibold' : 'text-parchment/50'
          }`}
        >
          Pay via Razorpay
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 font-body text-sm py-1.5 rounded transition ${
            mode === 'manual' ? 'bg-brass text-ink font-semibold' : 'text-parchment/50'
          }`}
        >
          Log manual spend
        </button>
      </div>

      <form onSubmit={mode === 'razorpay' ? submitRazorpay : submitManual}>
        <label className="font-body text-xs uppercase tracking-widest text-parchment/50">Pay using</label>
        <select
          value={bucketId}
          onChange={(e) => setBucketId(e.target.value)}
          className="w-full mt-1 mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
        >
          {spendable.length === 0 && <option value="">No spendable buckets</option>}
          {spendable.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — ₹{Number(b.balance).toLocaleString('en-IN')}
            </option>
          ))}
        </select>

        <label className="font-body text-xs uppercase tracking-widest text-parchment/50">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full mt-1 mb-4 bg-ink text-parchment font-mono rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
        />

        <label className="font-body text-xs uppercase tracking-widest text-parchment/50">Note</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. groceries"
          className="w-full mt-1 mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
        />

        {error && <p className="text-coral text-sm font-body mb-2">{error}</p>}
        {status && <p className="text-sage text-sm font-body mb-2">{status}</p>}

        <button
          type="submit"
          disabled={busy || !bucketId || !amount}
          className="w-full bg-brass text-ink font-body font-semibold py-2 rounded-md disabled:opacity-30 hover:bg-brassSoft transition"
        >
          {busy ? 'Processing...' : mode === 'razorpay' ? 'Pay with Razorpay' : 'Log spend'}
        </button>
      </form>

      {mode === 'razorpay' && (
        <p className="font-body text-xs text-parchment/30 mt-3">
          Opens Razorpay's real checkout (test mode). Choose Netbanking → any bank → Success for a
          reliable test — card test numbers can behave inconsistently on unactivated accounts.
        </p>
      )}
    </div>
  );
}
