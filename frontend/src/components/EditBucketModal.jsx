import React, { useState } from 'react';
import { api } from '../api';

const COLORS = ['green', 'blue', 'purple', 'brass', 'teal', 'olive'];
const COLOR_HEX = { green: '#22C48D', blue: '#3FA7D6', purple: '#8B5FBF', brass: '#FFC93C', teal: '#1FAF9E', olive: '#F4436C' };

export default function EditBucketModal({ bucket, onClose, onSaved, onDeleted }) {
  const [name, setName] = useState(bucket.name);
  const [color, setColor] = useState(bucket.color || 'teal');
  const [custodianName, setCustodianName] = useState(bucket.custodian_name || '');
  const [dueDate, setDueDate] = useState(bucket.due_date ? bucket.due_date.slice(0, 10) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const inputClass = "w-full mt-1 mb-4 bg-paper text-ink font-body rounded-2xl px-4 py-2.5 border-2 border-ink/10 focus:outline-none focus:border-teal";
  const labelClass = "font-body text-xs uppercase font-semibold tracking-widest text-inkSoft";

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.updateBucket(bucket.id, {
        name,
        color,
        custodianName: bucket.type === 'custodial' ? custodianName : null,
        dueDate: bucket.type === 'custodial' && dueDate ? new Date(dueDate).toISOString() : null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError('');
    try {
      await api.deleteBucket(bucket.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/50 overflow-y-auto p-4 sm:p-6 z-50">
      <form onSubmit={save} className="bg-white rounded-3xl p-6 max-w-md w-full mx-auto my-8 shadow-2xl">
        <h3 className="font-display font-semibold text-2xl text-ink mb-4">Edit "{bucket.name}"</h3>

        <label className={labelClass}>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />

        {bucket.type === 'custodial' && (
          <>
            <label className={labelClass}>Whose money is this?</label>
            <input type="text" value={custodianName} onChange={(e) => setCustodianName(e.target.value)} className={inputClass} />
            <label className={labelClass}>Due back on</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </>
        )}

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

        <div className="flex gap-3 mb-4">
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
            {busy ? 'Saving...' : 'Save changes'}
          </button>
        </div>

        <div className="border-t-2 border-ink/10 pt-4">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="w-full text-center text-sm font-body font-semibold text-rose"
            >
              Delete this bucket
            </button>
          ) : (
            <div>
              <p className="font-body text-xs text-inkSoft mb-2">
                {Number(bucket.balance) > 0
                  ? `This bucket still holds ₹${Number(bucket.balance).toLocaleString('en-IN')} — transfer it out first, deletion will be refused.`
                  : "This can't be undone. Are you sure?"}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 font-body font-semibold text-sm py-2.5 rounded-full border-2 border-ink/15 text-inkSoft"
                >
                  Never mind
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="flex-1 bg-rose text-white font-body font-semibold text-sm py-2.5 rounded-full disabled:opacity-30"
                >
                  {busy ? 'Deleting...' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
