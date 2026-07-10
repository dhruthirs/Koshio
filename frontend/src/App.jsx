import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import Header from './components/Header';
import Footer from './components/Footer';
import BucketCard from './components/BucketCard';
import DonutChart from './components/DonutChart';
import AllocateForm from './components/AllocateForm';
import PayForm from './components/PayForm';
import HistoryPanel from './components/HistoryPanel';
import CreateBucketModal from './components/CreateBucketModal';
import AuthScreen from './components/AuthScreen';

const TABS = ['Dashboard', 'Money in', 'Pay', 'History'];

export default function App() {
  const [walletId, setWalletId] = useState(api.getWalletId());
  const [tab, setTab] = useState('Dashboard');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [buckets, setBuckets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!walletId) return;
    try {
      const [b, n] = await Promise.all([api.getBuckets(walletId), api.notifications(walletId)]);
      setBuckets(b);
      setNotifications(n.filter((x) => !x.is_read));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [walletId]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!walletId) {
    return <AuthScreen onAuthenticated={() => setWalletId(api.getWalletId())} />;
  }

  const total = buckets.reduce((sum, b) => sum + Number(b.balance), 0);

  function logout() {
    api.clearSession();
    setWalletId(null);
    setBuckets([]);
    setNotifications([]);
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Header total={total} bucketCount={buckets.length} onLogout={logout} />

      {notifications.length > 0 && (
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 mt-4">
          {notifications.map((n) => (
            <div key={n.id} className="flex items-center justify-between gap-3 bg-rose/95 text-white text-sm font-body font-medium rounded-2xl px-4 py-3 mb-2 shadow-sm">
              <span>{n.message}</span>
              <button
                onClick={async () => { await api.markNotificationRead(n.id); refresh(); }}
                className="text-white/80 hover:text-white shrink-0 font-bold"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <nav className="max-w-5xl mx-auto w-full px-4 sm:px-6 mt-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-1 bg-white rounded-full p-1.5 shadow-sm overflow-x-auto max-w-full">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-body text-sm font-semibold px-4 py-2 rounded-full transition whitespace-nowrap ${
                tab === t ? 'bg-ink text-white' : 'text-inkSoft hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="font-body text-sm font-semibold text-white bg-teal hover:brightness-105 rounded-full px-4 py-2 shadow-sm transition self-start sm:self-auto"
        >
          + New bucket
        </button>
      </nav>

      {showCreateModal && (
        <CreateBucketModal walletId={walletId} onClose={() => setShowCreateModal(false)} onCreated={refresh} />
      )}

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-10 flex-1">
        {loading ? (
          <p className="font-body text-inkSoft">Loading...</p>
        ) : tab === 'Dashboard' ? (
          <div className="animate-fade-in">
            {buckets.length > 0 && <DonutChart buckets={buckets} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {buckets.length === 0 ? (
                <p className="font-body text-inkSoft">No buckets yet — create one to get started.</p>
              ) : (
                buckets.map((b, i) => (
                  <div key={b.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <BucketCard bucket={b} onChanged={refresh} />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : tab === 'Money in' ? (
          <div className="animate-fade-in"><AllocateForm walletId={walletId} buckets={buckets} onDone={refresh} /></div>
        ) : tab === 'Pay' ? (
          <div className="animate-fade-in"><PayForm buckets={buckets} onDone={refresh} /></div>
        ) : (
          <div className="animate-fade-in"><HistoryPanel buckets={buckets} /></div>
        )}
      </main>

      <Footer />
    </div>
  );
}
