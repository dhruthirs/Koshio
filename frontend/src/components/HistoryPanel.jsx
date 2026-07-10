import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function HistoryPanel({ buckets }) {
  const [bucketId, setBucketId] = useState(buckets[0]?.id || '');
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (bucketId) api.ledger(bucketId).then(setEntries).catch(() => setEntries([]));
  }, [bucketId]);

  const TYPE_LABEL = {
    deposit: 'Money in',
    withdraw: 'Spent',
    transfer_in: 'Transferred in',
    transfer_out: 'Transferred out',
  };

  return (
    <div className="bg-white rounded-3xl p-6 max-w-2xl shadow-sm">
      <h3 className="font-display font-semibold text-2xl text-ink mb-4">Transaction history</h3>
      <select
        value={bucketId}
        onChange={(e) => setBucketId(e.target.value)}
        className="w-full mb-4 bg-paper text-ink font-body rounded-2xl px-4 py-2.5 border-2 border-ink/10 focus:outline-none focus:border-teal"
      >
        {buckets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>

      {entries.length === 0 ? (
        <p className="font-body text-sm text-inkSoft">No transactions yet for this bucket.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {entries.map((e) => (
            <div key={e.id} className="flex justify-between items-center border-b-2 border-paper pb-2">
              <div>
                <p className="font-body text-sm font-medium text-ink">
                  {TYPE_LABEL[e.entry_type] || e.entry_type}
                  {e.note && <span className="text-inkSoft"> · {e.note}</span>}
                </p>
                <p className="font-body text-xs text-inkSoft">
                  {new Date(e.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <span
                className={`font-mono text-sm font-semibold ${
                  e.entry_type === 'withdraw' || e.entry_type === 'transfer_out' ? 'text-rose' : 'text-mint'
                }`}
              >
                {e.entry_type === 'withdraw' || e.entry_type === 'transfer_out' ? '−' : '+'}₹
                {Number(e.amount).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
