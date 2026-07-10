import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ContributionsPanel({ bucketId, onChanged, dark }) {
  const [data, setData] = useState({ entries: [], totalsByPerson: {} });
  const [contributor, setContributor] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const textClass = dark ? 'text-ink/70' : 'text-white/80';

  async function load() {
    try {
      const res = await api.contributions(bucketId);
      setData(res);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => { load(); }, [bucketId]);

  async function addContribution(e) {
    e.preventDefault();
    setError('');
    if (!contributor.trim() || !amount) return;
    setBusy(true);
    try {
      await api.addContribution(bucketId, { contributorName: contributor.trim(), amount: Number(amount) });
      setContributor('');
      setAmount('');
      await load();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-black/10">
      <p className={`font-body text-xs uppercase font-semibold tracking-widest ${textClass} mb-2`}>
        Contributors
      </p>

      {Object.keys(data.totalsByPerson).length === 0 ? (
        <p className={`font-body text-xs ${textClass} mb-3`}>No contributions yet.</p>
      ) : (
        <div className="space-y-1 mb-3">
          {Object.entries(data.totalsByPerson).map(([person, total]) => (
            <div key={person} className={`flex justify-between font-body text-xs font-medium ${textClass}`}>
              <span>{person}</span>
              <span className="font-mono">₹{Number(total).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addContribution} className="flex gap-2">
        <input
          type="text"
          value={contributor}
          onChange={(e) => setContributor(e.target.value)}
          placeholder="Name"
          className="w-1/2 bg-white/90 text-ink font-body text-xs rounded-full px-3 py-1.5 focus:outline-none"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-1/2 bg-white/90 text-ink font-mono text-xs rounded-full px-3 py-1.5 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="text-xs font-body font-semibold text-white bg-black/20 hover:bg-black/30 rounded-full shrink-0 px-3"
        >
          Add
        </button>
      </form>
      {error && <p className="text-white bg-black/20 rounded-full px-2 py-1 text-xs font-body mt-1 inline-block">{error}</p>}
    </div>
  );
}
