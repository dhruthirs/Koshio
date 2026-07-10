import React, { useState } from 'react';
import { api } from '../api';

export default function PayForm({ buckets, onDone }) {
  const spendable = buckets.filter((b) => !b.is_locked);
  const [mode, setMode] = useState('razorpay');
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
      setStatus(res.budgetStatus?.overspent
        ? "Logged. Over this bucket's monthly limit — an alert was recorded."
        : 'Logged.');
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
        theme: { color: '#1FAF9E' },
      });
      rzp.on('payment.failed', () => setError('Payment failed or was cancelled. Nothing was deducted.'));
      rzp.open();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full mt-1 mb-4 bg-paper text-ink font-body rounded-2xl px-4 py-2.5 border-2 border-ink/10 focus:outline-none focus:border-teal";
  const labelClass = "font-body text-xs uppercase font-semibold tracking-widest text-inkSoft";

  return (
    <div className="bg-white rounded-3xl p-6 max-w-lg shadow-sm">
      <h3 className="font-display font-semibold text-2xl text-ink mb-1">Pay from a bucket</h3>
      <p className="font-body text-xs text-inkSoft mb-4">
        Locked buckets aren't shown here — unlock or transfer out first.
      </p>

      <div className="flex gap-2 mb-5 bg-paper rounded-full p-1.5">
        <button
          type="button"
          onClick={() => setMode('razorpay')}
          className={`flex-1 font-body text-sm font-semibold py-2 rounded-full transition ${
            mode === 'razorpay' ? 'bg-teal text-white' : 'text-inkSoft'
          }`}
        >
          Pay via Razorpay
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 font-body text-sm font-semibold py-2 rounded-full transition ${
            mode === 'manual' ? 'bg-teal text-white' : 'text-inkSoft'
          }`}
        >
          Log manual spend
        </button>
      </div>

      <form onSubmit={mode === 'razorpay' ? submitRazorpay : submitManual}>
        <label className={labelClass}>Pay using</label>
        <select value={bucketId} onChange={(e) => setBucketId(e.target.value)} className={inputClass}>
          {spendable.length === 0 && <option value="">No spendable buckets</option>}
          {spendable.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — ₹{Number(b.balance).toLocaleString('en-IN')}
            </option>
          ))}
        </select>

        <label className={labelClass}>Amount</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />

        <label className={labelClass}>Note</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. groceries"
          className={inputClass}
        />

        {error && <p className="text-white bg-rose rounded-xl px-3 py-2 text-sm font-body mb-2">{error}</p>}
        {status && <p className="text-white bg-mint rounded-xl px-3 py-2 text-sm font-body mb-2">{status}</p>}

        <button
          type="submit"
          disabled={busy || !bucketId || !amount}
          className="w-full bg-teal text-white font-body font-semibold py-2.5 rounded-full disabled:opacity-30 hover:brightness-105 transition"
        >
          {busy ? 'Processing...' : mode === 'razorpay' ? 'Pay with Razorpay' : 'Log spend'}
        </button>
      </form>

      {mode === 'razorpay' && (
        <p className="font-body text-xs text-inkSoft/70 mt-3">
          Opens Razorpay's real checkout (test mode). Choose Netbanking → any bank → Success for a
          reliable test — card test numbers can behave inconsistently on unactivated accounts.
        </p>
      )}
    </div>
  );
}
