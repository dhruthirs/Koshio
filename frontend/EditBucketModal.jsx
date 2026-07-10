import React, { useState } from 'react';
import { api } from '../api';

const COLORS = ['green', 'blue', 'purple', 'brass', 'teal', 'olive'];
const COLOR_HEX = { green: '#6B8F71', blue: '#5B7FA6', purple: '#8E6FA6', brass: '#C89B3C', teal: '#4A8B8C', olive: '#8A8B4A' };

export default function EditBucketModal({ bucket, onClose, onSaved, onDeleted }) {
  const [name, setName] = useState(bucket.name);
  const [color, setColor] = useState(bucket.color || 'green');
  const [custodianName, setCustodianName] = useState(bucket.custodian_name || '');
  const [dueDate, setDueDate] = useState(bucket.due_date ? bucket.due_date.slice(0, 10) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
      <form onSubmit={save} className="bg-inkSoft rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="font-display text-xl text-parchment mb-4">Edit "{bucket.name}"</h3>

        <label className="font-body text-xs uppercase tracking-widest text-parchment/50">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mt-1 mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
        />

        {bucket.type === 'custodial' && (
          <>
            <label className="font-body text-xs uppercase tracking-widest text-parchment/50">
              Whose money is this?
            </label>
            <input
              type="text"
              value={custodianName}
              onChange={(e) => setCustodianName(e.target.value)}
              className="w-full mt-1 mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
            />
            <label className="font-body text-xs uppercase tracking-widest text-parchment/50">Due back on</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full mt-1 mb-4 bg-ink text-parchment font-body rounded-md px-3 py-2 border border-parchment/10 focus:outline-none focus:border-brass"
            />
          </>
        )}

        <label className="font-body text-xs uppercase tracking-widest text-parchment/50">Color</label>
        <div className="flex gap-2 mt-1 mb-5">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-parchment' : 'border-transparent'}`}
              style={{ background: COLOR_HEX[c] }}
              aria-label={c}
            />
          ))}
        </div>

        {error && <p className="text-coral text-sm font-body mb-3">{error}</p>}

        <div className="flex gap-3 mb-4">
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
            {busy ? 'Saving...' : 'Save changes'}
          </button>
        </div>

        <div className="border-t border-parchment/10 pt-4">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="w-full text-center text-sm font-body text-coral/70 hover:text-coral"
            >
              Delete this bucket
            </button>
          ) : (
            <div>
              <p className="font-body text-xs text-parchment/50 mb-2">
                {Number(bucket.balance) > 0
                  ? `This bucket still holds ₹${Number(bucket.balance).toLocaleString('en-IN')} — transfer it out first, deletion will be refused.`
                  : 'This can\'t be undone. Are you sure?'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 font-body text-sm py-2 rounded-md border border-parchment/20 text-parchment/70"
                >
                  Never mind
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="flex-1 bg-coral text-ink font-body font-semibold py-2 rounded-md disabled:opacity-30"
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
