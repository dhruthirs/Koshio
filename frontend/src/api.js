const BASE_URL = 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getBuckets: (walletId) => request(`/wallets/${walletId}/buckets`),
  createBucket: (walletId, body) =>
    request(`/wallets/${walletId}/buckets`, { method: 'POST', body: JSON.stringify(body) }),
  deposit: (walletId, body) =>
    request(`/wallets/${walletId}/deposit`, { method: 'POST', body: JSON.stringify(body) }),
  spend: (bucketId, body) =>
    request(`/buckets/${bucketId}/spend`, { method: 'POST', body: JSON.stringify(body) }),
  createPaymentOrder: (bucketId, body) =>
    request(`/buckets/${bucketId}/create-payment-order`, { method: 'POST', body: JSON.stringify(body) }),
  transfer: (bucketId, body) =>
    request(`/buckets/${bucketId}/transfer`, { method: 'POST', body: JSON.stringify(body) }),
  lock: (bucketId, body) => request(`/buckets/${bucketId}/lock`, { method: 'POST', body: JSON.stringify(body) }),
  unlock: (bucketId) => request(`/buckets/${bucketId}/unlock`, { method: 'POST', body: '{}' }),
  ledger: (bucketId) => request(`/buckets/${bucketId}/ledger`),
  notifications: (walletId) => request(`/wallets/${walletId}/notifications`),
  goalProgress: (bucketId) => request(`/buckets/${bucketId}/goal-progress`),
  contributions: (bucketId) => request(`/buckets/${bucketId}/contributions`),
};
