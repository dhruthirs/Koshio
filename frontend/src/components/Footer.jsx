import React from 'react';

export default function Footer() {
  return (
    <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-8 mt-4">
      <div className="border-t border-ink/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <p className="font-body text-xs text-inkSoft">
          Koshio — a virtual money vault, built to keep every purpose separate.
        </p>
        <p className="font-body text-xs text-inkSoft/60">
          Real payments run through Razorpay in test mode.
        </p>
      </div>
    </footer>
  );
}
