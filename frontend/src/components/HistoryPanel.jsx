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
    <div className="bg-inkSoft rounded-xl p-6 max-w-2xl">
      <h3 className="font-display text-xl text-parchment mb-4">Transaction history</h3>
      <select
        value={bucketId}
        onChange={(e) => setBucketId(e.target.value)}
        className="w-full mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
      >
        {buckets.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      {entries.length === 0 ? (
        <p className="font-body text-sm text-parchment/40">No transactions yet for this bucket.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {entries.map((e) => (
            <div key={e.id} className="flex justify-between items-center border-b border-parchment/10 pb-2">
              <div>
                <p className="font-body text-sm text-parchment/90">
                  {TYPE_LABEL[e.entry_type] || e.entry_type}
                  {e.note && <span className="text-parchment/40"> · {e.note}</span>}
                </p>
                <p className="font-body text-xs text-parchment/40">
                  {new Date(e.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <span
                className={`font-mono text-sm ${
                  e.entry_type === 'withdraw' || e.entry_type === 'transfer_out' ? 'text-coral' : 'text-sage'
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
