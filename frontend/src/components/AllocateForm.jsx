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
    <form onSubmit={submit} className="bg-inkSoft rounded-xl p-6 max-w-lg">
      <h3 className="font-display text-xl text-parchment mb-4">Money in</h3>

      <label className="font-body text-xs uppercase tracking-widest text-parchment/50">
        Amount received
      </label>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="e.g. 5000"
        className="w-full mt-1 mb-4 bg-ink text-parchment font-mono text-lg rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
      />

      <p className="font-body text-xs uppercase tracking-widest text-parchment/50 mb-2">
        Split it across buckets
      </p>
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {buckets.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3">
            <span className="font-body text-sm text-parchment/80 flex-1">{b.name}</span>
            <input
              type="number"
              value={splits[b.id] || ''}
              onChange={(e) => setSplits({ ...splits, [b.id]: e.target.value })}
              placeholder="0"
              className="w-28 bg-ink text-parchment font-mono text-sm rounded-md px-2 py-1 border border-parchment/10 focus:outline-none focus:border-brass"
            />
          </div>
        ))}
      </div>

      <p className={`font-mono text-sm mt-3 ${remaining === 0 ? 'text-sage' : 'text-coral'}`}>
        Remaining to allocate: ₹{remaining.toLocaleString('en-IN')}
      </p>

      {error && <p className="text-coral text-sm font-body mt-2">{error}</p>}

      <button
        type="submit"
        disabled={busy || !amount || remaining !== 0}
        className="mt-4 w-full bg-brass text-ink font-body font-semibold py-2 rounded-md disabled:opacity-30 hover:bg-brassSoft transition"
      >
        {busy ? 'Allocating...' : 'Allocate'}
      </button>
    </form>
  );
}
