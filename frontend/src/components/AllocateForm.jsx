import React, { useState } from 'react';
import { api } from '../api';

export default function AllocateForm({ walletId, buckets, onDone }) {
  const [amount, setAmount] = useState('');
  const [splits, setSplits] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const total = Object.values(splits).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const remaining = Number(amount || 0) - total;

  async function submit(e) {
    e.preventDefault();
    setError('');
    const allocations = Object.entries(splits)
      .filter(([, v]) => Number(v) > 0)
      .map(([bucketId, v]) => ({ bucketId, amount: Number(v) }));

    if (allocations.length === 0) {
      setError('Split the amount across at least one bucket.');
      return;
    }

    setBusy(true);
    try {
      await api.deposit(walletId, { amount: Number(amount), allocations });
      setAmount('');
      setSplits({});
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl p-6 max-w-lg shadow-sm">
      <h3 className="font-display font-semibold text-2xl text-ink mb-4">Money in</h3>

      <label className="font-body text-xs uppercase font-semibold tracking-widest text-inkSoft">
        Amount received
      </label>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="e.g. 5000"
        className="w-full mt-1 mb-4 bg-paper text-ink font-mono text-lg rounded-2xl px-4 py-2.5 border-2 border-ink/10 focus:outline-none focus:border-teal"
      />

      <p className="font-body text-xs uppercase font-semibold tracking-widest text-inkSoft mb-2">
        Split it across buckets
      </p>
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {buckets.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3">
            <span className="font-body text-sm font-medium text-ink flex-1">{b.name}</span>
            <input
              type="number"
              value={splits[b.id] || ''}
              onChange={(e) => setSplits({ ...splits, [b.id]: e.target.value })}
              placeholder="0"
              className="w-28 bg-paper text-ink font-mono text-sm rounded-full px-3 py-1.5 border-2 border-ink/10 focus:outline-none focus:border-teal"
            />
          </div>
        ))}
      </div>

      <p className={`font-mono text-sm font-medium mt-3 ${remaining === 0 ? 'text-mint' : 'text-rose'}`}>
        Remaining to allocate: ₹{remaining.toLocaleString('en-IN')}
      </p>

      {error && <p className="text-white bg-rose rounded-xl px-3 py-2 text-sm font-body mt-2">{error}</p>}

      <button
        type="submit"
        disabled={busy || !amount || remaining !== 0}
        className="mt-4 w-full bg-teal text-white font-body font-semibold py-2.5 rounded-full disabled:opacity-30 hover:brightness-105 transition"
      >
        {busy ? 'Allocating...' : 'Allocate'}
      </button>
    </form>
  );
}
