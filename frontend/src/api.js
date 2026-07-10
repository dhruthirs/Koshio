const BASE_URL = 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('koshio_token');
}

function setSession(token, walletId) {
  localStorage.setItem('koshio_token', token);
  localStorage.setItem('koshio_wallet_id', walletId);
}

function clearSession() {
  localStorage.removeItem('koshio_token');
  localStorage.removeItem('koshio_wallet_id');
}

function getWalletId() {
  return localStorage.getItem('koshio_wallet_id');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getToken,
  setSession,
  clearSession,
  getWalletId,

  signup: (name, email, password) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getBuckets: (walletId) => request(`/wallets/${walletId}/buckets`),
  createBucket: (walletId, body) =>
    request(`/wallets/${walletId}/buckets`, { method: 'POST', body: JSON.stringify(body) }),
  updateBucket: (bucketId, body) =>
    request(`/buckets/${bucketId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteBucket: (bucketId) => request(`/buckets/${bucketId}`, { method: 'DELETE' }),
  addContribution: (bucketId, body) =>
    request(`/buckets/${bucketId}/contributions`, { method: 'POST', body: JSON.stringify(body) }),
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
  markNotificationRead: (notificationId) =>
    request(`/notifications/${notificationId}/read`, { method: 'POST', body: '{}' }),
  goalProgress: (bucketId) => request(`/buckets/${bucketId}/goal-progress`),
  contributions: (bucketId) => request(`/buckets/${bucketId}/contributions`),
};

