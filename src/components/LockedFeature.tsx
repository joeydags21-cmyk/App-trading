'use client';

import { useState } from 'react';

interface LockedFeatureProps {
  label?: string;
}

/**
 * Compact locked state shown inside a card when a feature requires a subscription.
 * Used in the dashboard CoachCard when subscription status is known on load.
 */
export default function LockedFeature({ label = 'This feature' }: LockedFeatureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startTrial() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Something went wrong.');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || 'Unable to start checkout. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="w-8 h-8 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center justify-center mb-3">
        <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
          <rect x="2" y="6" width="11" height="8" rx="1.5" stroke="#a78bfa" strokeWidth="1.3" />
          <path d="M5 6V4.5a2.5 2.5 0 015 0V6" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-zinc-300 mb-0.5">
        {label} requires a subscription
      </p>
      <p className="text-xs text-zinc-600 mb-4">
        Start your 3-day free trial to unlock AI coaching
      </p>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      <button
        onClick={startTrial}
        disabled={loading}
        className="bg-white text-zinc-950 font-semibold py-1.5 px-4 rounded-lg hover:bg-zinc-100 transition-all disabled:opacity-60 text-xs flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Redirecting...
          </>
        ) : 'Start Free Trial'}
      </button>
    </div>
  );
}
