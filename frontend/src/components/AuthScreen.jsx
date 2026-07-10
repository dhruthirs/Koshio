import React, { useState } from 'react';
import { api } from '../api';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = mode === 'signup' ? await api.signup(name, email, password) : await api.login(email, password);
      api.setSession(result.token, result.walletId);
      onAuthenticated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full mt-1 mb-4 bg-paper text-ink font-body rounded-2xl px-4 py-2.5 border-2 border-ink/10 focus:outline-none focus:border-teal";
  const labelClass = "font-body text-xs uppercase font-semibold tracking-widest text-inkSoft";

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <form onSubmit={submit} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl">
        <p className="font-body text-xs uppercase font-bold tracking-[0.3em] text-teal mb-1">Koshio</p>
        <h1 className="font-display font-semibold text-3xl text-ink mb-6">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>

        {mode === 'signup' && (
          <>
            <label className={labelClass}>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </>
        )}

        <label className={labelClass}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />

        <label className={labelClass}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />

        {error && <p className="text-white bg-rose rounded-xl px-3 py-2 text-sm font-body mb-3">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-teal text-white font-body font-semibold py-2.5 rounded-full disabled:opacity-30 hover:brightness-105 transition"
        >
          {busy ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          className="w-full text-center text-sm font-body font-medium text-inkSoft hover:text-ink mt-4"
        >
          {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}
        </button>
      </form>
    </div>
  );
}
