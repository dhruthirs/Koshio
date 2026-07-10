import React, { useEffect, useState } from 'react';
import { api } from '../api';
import EditBucketModal from './EditBucketModal';
import ContributionsPanel from './ContributionsPanel';

const BG_COLORS = {
  green: '#22C48D',
  blue: '#3FA7D6',
  purple: '#8B5FBF',
  brass: '#FFC93C',
  teal: '#1FAF9E',
  olive: '#F4436C',
};

// Text reads dark on the bright yellow card, white on everything else.
const DARK_TEXT_COLORS = new Set(['brass']);

export default function BucketCard({ bucket, onChanged }) {
  const [goal, setGoal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const bg = BG_COLORS[bucket.color] || '#3FA7D6';
  const dark = DARK_TEXT_COLORS.has(bucket.color);
  const textClass = dark ? 'text-ink' : 'text-white';
  const subTextClass = dark ? 'text-ink/60' : 'text-white/75';

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
    <div
      className={`tag-card ${bucket.is_locked ? 'opacity-80' : ''}`}
      style={{ background: bg }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`font-body text-xs uppercase font-semibold tracking-widest ${subTextClass}`}>
            {bucket.type}
          </p>
          <h3 className={`font-display font-semibold text-xl ${textClass} mt-0.5`}>{bucket.name}</h3>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className={`font-body text-xs font-semibold ${subTextClass} hover:${textClass} bg-black/10 rounded-full px-3 py-1`}
        >
          Edit
        </button>
      </div>

      {bucket.is_locked && (
        <span className="inline-block mt-2 text-xs font-body font-semibold bg-black/20 text-white px-2 py-0.5 rounded-full">
          🔒 Locked
        </span>
      )}

      <p className={`font-mono font-medium text-3xl ${textClass} mt-4`}>
        ₹{Number(bucket.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </p>

      {bucket.custodian_name && (
        <p className={`font-body text-xs ${subTextClass} mt-2`}>
          Holding for <span className="font-semibold">{bucket.custodian_name}</span>
          {bucket.due_date && ` · due ${new Date(bucket.due_date).toLocaleDateString('en-IN')}`}
        </p>
      )}

      {goal?.hasGoal && (
        <div className="mt-4">
          <div className={`flex justify-between text-xs font-body font-medium ${subTextClass} mb-1`}>
            <span>{goal.percentComplete}% of ₹{Number(goal.goalAmount).toLocaleString('en-IN')}</span>
            {goal.daysRemaining != null && <span>{goal.daysRemaining}d left</span>}
          </div>
          <div className="h-2 bg-black/15 rounded-full overflow-hidden">
            <div
              className={dark ? 'h-full rounded-full bg-ink/70' : 'h-full rounded-full bg-white'}
              style={{ width: `${goal.percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {bucket.monthly_limit && (
        <p className={`font-body text-xs ${subTextClass} mt-2`}>
          Limit: ₹{Number(bucket.monthly_limit).toLocaleString('en-IN')}/mo
        </p>
      )}

      {bucket.type === 'shared' && (
        <ContributionsPanel bucketId={bucket.id} onChanged={onChanged} dark={dark} />
      )}

      <button
        onClick={toggleLock}
        disabled={busy}
        className={`mt-4 text-xs font-body font-semibold ${subTextClass} hover:${textClass} disabled:opacity-40`}
      >
        {bucket.is_locked ? '🔓 Unlock (transfer out to spend)' : '🔒 Lock this bucket'}
      </button>

      {showEdit && (
        <EditBucketModal
          bucket={bucket}
          onClose={() => setShowEdit(false)}
          onSaved={onChanged}
          onDeleted={onChanged}
        />
      )}
    </div>
  );
}
