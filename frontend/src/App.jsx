import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import BucketCard from './components/BucketCard';
import AllocateForm from './components/AllocateForm';
import PayForm from './components/PayForm';
import HistoryPanel from './components/HistoryPanel';
import CreateBucketModal from './components/CreateBucketModal';

// Hardcoded for now — swap for real auth/wallet lookup later.
const WALLET_ID = '820ecff9-2c75-47dd-bc5b-feece2b261b4';

const TABS = ['Dashboard', 'Money in', 'Pay', 'History'];

export default function App() {
  const [tab, setTab] = useState('Dashboard');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [buckets, setBuckets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [b, n] = await Promise.all([
        api.getBuckets(WALLET_ID),
        api.notifications(WALLET_ID),
      ]);
      setBuckets(b);
      setNotifications(n.filter((x) => !x.is_read));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const total = buckets.reduce((sum, b) => sum + Number(b.balance), 0);

  return (
    <div className="min-h-screen bg-ink">
      <header className="max-w-5xl mx-auto px-6 pt-10 pb-6">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">Koshio</p>
        <h1 className="font-display text-4xl text-parchment mt-1">
          ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </h1>
        <p className="font-body text-sm text-parchment/40 mt-1">across {buckets.length} buckets</p>
      </header>

      {notifications.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 mb-4">
          {notifications.map((n) => (
            <div key={n.id} className="bg-coral/10 border border-coral/30 text-coral text-sm font-body rounded-md px-4 py-2 mb-2">
              {n.message}
            </div>
          ))}
        </div>
      )}

      <nav className="max-w-5xl mx-auto px-6 flex items-center justify-between border-b border-parchment/10 mb-8">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-body text-sm pb-3 border-b-2 transition ${
                tab === t ? 'border-brass text-parchment' : 'border-transparent text-parchment/40 hover:text-parchment/70'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="font-body text-sm text-brass hover:text-brassSoft pb-3"
        >
          + New bucket
        </button>
      </nav>

      {showCreateModal && (
        <CreateBucketModal
          walletId={WALLET_ID}
          onClose={() => setShowCreateModal(false)}
          onCreated={refresh}
        />
      )}

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {loading ? (
          <p className="font-body text-parchment/40">Loading...</p>
        ) : tab === 'Dashboard' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {buckets.length === 0 ? (
              <p className="font-body text-parchment/40">No buckets yet — create one via the API to get started.</p>
            ) : (
              buckets.map((b) => <BucketCard key={b.id} bucket={b} onChanged={refresh} />)
            )}
          </div>
        ) : tab === 'Money in' ? (
          <AllocateForm walletId={WALLET_ID} buckets={buckets} onDone={refresh} />
        ) : tab === 'Pay' ? (
          <PayForm buckets={buckets} onDone={refresh} />
        ) : (
          <HistoryPanel buckets={buckets} />
        )}
      </main>
    </div>
  );
}
