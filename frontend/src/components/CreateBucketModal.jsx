import React, { useState } from 'react';
import { api } from '../api';

const COLORS = ['green', 'blue', 'purple', 'brass', 'teal', 'olive'];
const COLOR_HEX = { green: '#22C48D', blue: '#3FA7D6', purple: '#8B5FBF', brass: '#FFC93C', teal: '#1FAF9E', olive: '#F4436C' };
const TYPES = [
  { value: 'general', label: 'General' },
  { value: 'savings', label: 'Savings (can set a goal)' },
  { value: 'custodial', label: "Holding someone else's money" },
  { value: 'shared', label: 'Shared (trip/event fund)' },
];

export default function CreateBucketModal({ walletId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('general');
  const [color, setColor] = useState('teal');
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.getToken()}` },
          body: JSON.stringify({
            goalAmount: Number(goalAmount),
            goalDeadline: goalDeadline ? new Date(goalDeadline).toISOString() : null,
          }),
        });
      }

      if (monthlyLimit) {
        await fetch(`http://localhost:4000/buckets/${bucket.id}/limit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.getToken()}` },
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

  const inputClass = "w-full mt-1 mb-4 bg-paper text-ink font-body rounded-2xl px-4 py-2.5 border-2 border-ink/10 focus:outline-none focus:border-teal";
  const labelClass = "font-body text-xs uppercase font-semibold tracking-widest text-inkSoft";

  return (
    <div className="fixed inset-0 bg-ink/50 overflow-y-auto p-4 sm:p-6 z-50">
      <form onSubmit={submit} className="bg-white rounded-3xl p-6 max-w-md w-full mx-auto my-8 shadow-2xl">
        <h3 className="font-display font-semibold text-2xl text-ink mb-4">New bucket</h3>

        <label className={labelClass}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Priya's Money, Netflix, Wedding Fund"
          className={inputClass}
        />

        <label className={labelClass}>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {type === 'custodial' && (
          <>
            <label className={labelClass}>Whose money is this?</label>
            <input
              type="text"
              value={custodianName}
              onChange={(e) => setCustodianName(e.target.value)}
              placeholder="e.g. Priya"
              className={inputClass}
            />
            <label className={labelClass}>Due back on (optional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </>
        )}

        {type === 'savings' && (
          <>
            <label className={labelClass}>Goal amount (optional)</label>
            <input
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="e.g. 50000"
              className={inputClass}
            />
            {goalAmount && (
              <>
                <label className={labelClass}>Goal deadline (optional)</label>
                <input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} className={inputClass} />
              </>
            )}
          </>
        )}

        <label className={labelClass}>Monthly spending limit (optional)</label>
        <input
          type="number"
          value={monthlyLimit}
          onChange={(e) => setMonthlyLimit(e.target.value)}
          placeholder="e.g. 3000"
          className={inputClass}
        />

        <label className={labelClass}>Color</label>
        <div className="flex gap-2 mt-1 mb-5">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-full border-4 ${color === c ? 'border-ink' : 'border-transparent'}`}
              style={{ background: COLOR_HEX[c] }}
              aria-label={c}
            />
          ))}
        </div>

        {error && <p className="text-white bg-rose rounded-xl px-3 py-2 text-sm font-body mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 font-body font-semibold text-sm py-2.5 rounded-full border-2 border-ink/15 text-inkSoft"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-teal text-white font-body font-semibold text-sm py-2.5 rounded-full disabled:opacity-30 hover:brightness-105 transition"
          >
            {busy ? 'Creating...' : 'Create bucket'}
          </button>
        </div>
      </form>
    </div>
  );
}
