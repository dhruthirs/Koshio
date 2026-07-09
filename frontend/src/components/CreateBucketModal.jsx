import React, { useState } from 'react';
import { api } from '../api';

const COLORS = ['green', 'blue', 'purple', 'brass', 'teal', 'olive'];
const TYPES = [
  { value: 'general', label: 'General' },
  { value: 'savings', label: 'Savings (can set a goal)' },
  { value: 'custodial', label: "Holding someone else's money" },
  { value: 'shared', label: 'Shared (trip/event fund)' },
];

export default function CreateBucketModal({ walletId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('general');
  const [color, setColor] = useState('green');
  const [custodianName, setCustodianName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Give the bucket a name.'); return; }
    if (type === 'custodial' && !custodianName.trim()) {
      setError("Enter whose money this is holding — e.g. a friend's name.");
      return;
    }

    setBusy(true);
    try {
      const bucket = await api.createBucket(walletId, {
        name: name.trim(),
        type,
        color,
        custodianName: type === 'custodial' ? custodianName.trim() : null,
        dueDate: type === 'custodial' && dueDate ? new Date(dueDate).toISOString() : null,
      });

      if (type === 'savings' && goalAmount) {
        await fetch(`http://localhost:4000/buckets/${bucket.id}/goal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalAmount: Number(goalAmount),
            goalDeadline: goalDeadline ? new Date(goalDeadline).toISOString() : null,
          }),
        });
      }

      if (monthlyLimit) {
        await fetch(`http://localhost:4000/buckets/${bucket.id}/limit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthlyLimit: Number(monthlyLimit) }),
        });
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
      <form onSubmit={submit} className="bg-inkSoft rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="font-display text-xl text-parchment mb-4">New bucket</h3>

        <label className="font-body text-xs uppercase tracking-widest text-parchment/50">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Priya's Money, Netflix, Wedding Fund"
          className="w-full mt-1 mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
        />

        <label className="font-body text-xs uppercase tracking-widest text-parchment/50">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full mt-1 mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
        >
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {type === 'custodial' && (
          <>
            <label className="font-body text-xs uppercase tracking-widest text-parchment/50">
              Whose money is this?
            </label>
            <input
              type="text"
              value={custodianName}
              onChange={(e) => setCustodianName(e.target.value)}
              placeholder="e.g. Priya"
              className="w-full mt-1 mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
            />
            <label className="font-body text-xs uppercase tracking-widest text-parchment/50">
              Due back on (optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full mt-1 mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
            />
          </>
        )}

        {type === 'savings' && (
          <>
            <label className="font-body text-xs uppercase tracking-widest text-parchment/50">
              Goal amount (optional)
            </label>
            <input
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full mt-1 mb-4 bg-ink text-parchment font-mono rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
            />
            {goalAmount && (
              <>
                <label className="font-body text-xs uppercase tracking-widest text-parchment/50">
                  Goal deadline (optional)
                </label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="w-full mt-1 mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
                />
              </>
            )}
          </>
        )}

        <label className="font-body text-xs uppercase tracking-widest text-parchment/50">
          Monthly spending limit (optional)
        </label>
        <input
          type="number"
          value={monthlyLimit}
          onChange={(e) => setMonthlyLimit(e.target.value)}
          placeholder="e.g. 3000"
          className="w-full mt-1 mb-4 bg-ink text-parchment font-mono rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
        />

        <label className="font-body text-xs uppercase tracking-widest text-parchment/50">Color</label>
        <div className="flex gap-2 mt-1 mb-5">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-parchment' : 'border-transparent'}`}
              style={{
                background: { green: '#6B8F71', blue: '#5B7FA6', purple: '#8E6FA6', brass: '#C89B3C', teal: '#4A8B8C', olive: '#8A8B4A' }[c],
              }}
              aria-label={c}
            />
          ))}
        </div>

        {error && <p className="text-coral text-sm font-body mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 font-body text-sm py-2 rounded-md border border-parchment/20 text-parchment/70"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-brass text-ink font-body font-semibold py-2 rounded-md disabled:opacity-30 hover:bg-brassSoft transition"
          >
            {busy ? 'Creating...' : 'Create bucket'}
          </button>
        </div>
      </form>
    </div>
  );
}
