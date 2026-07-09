import React, { useEffect, useState } from 'react';
import { api } from '../api';

const ACCENTS = {
  green: '#6B8F71',
  blue: '#5B7FA6',
  purple: '#8E6FA6',
  brass: '#C89B3C',
};

export default function BucketCard({ bucket, onChanged }) {
  const [goal, setGoal] = useState(null);
  const [busy, setBusy] = useState(false);
  const accent = ACCENTS[bucket.color] || '#8A8474';

  useEffect(() => {
    if (bucket.goal_amount) {
      api.goalProgress(bucket.id).then(setGoal).catch(() => {});
    }
  }, [bucket.id, bucket.goal_amount, bucket.balance]);

  async function toggleLock() {
    setBusy(true);
    try {
      if (bucket.is_locked) await api.unlock(bucket.id);
      else await api.lock(bucket.id, {});
      onChanged();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`envelope-card rounded-b-lg shadow-lg px-6 pb-6 ${bucket.is_locked ? 'locked' : ''}`}>
      <div className="h-1 w-10 rounded-full mb-3" style={{ background: accent }} />

      <div className="flex items-start justify-between">
        <div>
          <p className="font-body text-xs uppercase tracking-widest text-inkText/50">
            {bucket.type}
          </p>
          <h3 className="font-display text-xl text-inkText mt-0.5">{bucket.name}</h3>
        </div>
        {bucket.is_locked && (
          <span className="text-xs font-body bg-coral/15 text-coral px-2 py-1 rounded-full">
            Locked
          </span>
        )}
      </div>

      <p className="font-mono text-3xl text-inkText mt-4">
        ₹{Number(bucket.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </p>

      {bucket.custodian_name && (
        <p className="font-body text-xs text-inkText/60 mt-2">
          Holding for <span className="font-medium">{bucket.custodian_name}</span>
          {bucket.due_date && ` · due ${new Date(bucket.due_date).toLocaleDateString('en-IN')}`}
        </p>
      )}

      {goal?.hasGoal && (
        <div className="mt-4">
          <div className="flex justify-between text-xs font-body text-inkText/60 mb-1">
            <span>{goal.percentComplete}% of ₹{Number(goal.goalAmount).toLocaleString('en-IN')}</span>
            {goal.daysRemaining != null && <span>{goal.daysRemaining}d left</span>}
          </div>
          <div className="h-1.5 bg-parchmentDim rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${goal.percentComplete}%`, background: accent }}
            />
          </div>
        </div>
      )}

      {bucket.monthly_limit && (
        <p className="font-body text-xs text-inkText/50 mt-2">
          Limit: ₹{Number(bucket.monthly_limit).toLocaleString('en-IN')}/mo
        </p>
      )}

      <button
        onClick={toggleLock}
        disabled={busy}
        className="mt-4 text-xs font-body text-inkText/70 underline decoration-dotted hover:text-inkText disabled:opacity-40"
      >
        {bucket.is_locked ? 'Unlock (transfer out to spend)' : 'Lock this bucket'}
      </button>
    </div>
  );
}
