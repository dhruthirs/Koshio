import React from 'react';

export default function Header({ total, bucketCount, onLogout }) {
  return (
    <header className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
      <div className="bg-white rounded-3xl shadow-sm px-5 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="font-body text-xs uppercase font-bold tracking-[0.25em] text-teal">Koshio</p>
          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-ink mt-1 leading-tight">
            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h1>
          <p className="font-body text-sm text-inkSoft mt-1">across {bucketCount} buckets</p>
        </div>
        <button
          onClick={onLogout}
          className="self-start sm:self-auto font-body text-sm font-semibold text-inkSoft hover:text-ink border border-ink/10 rounded-full px-4 py-2 transition"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
