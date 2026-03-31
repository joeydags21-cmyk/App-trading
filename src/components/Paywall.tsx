'use client';

import { useState } from 'react';

export default function Paywall() {
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
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full mx-auto">
        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
            <span className="text-xs font-medium text-violet-400">3-day free trial</span>
          </div>

          {/* Headline */}
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">
            Your Trading Edge Starts Here
          </h2>
          <p className="text-zinc-500 text-sm mb-8">
            $19/month after trial — cancel anytime
          </p>

          {/* Feature list */}
          <ul className="space-y-3 mb-8 text-left">
            {[
              { label: 'AI mistake detection', desc: 'Finds patterns in your trades that cost you money' },
              { label: 'Personalised coaching', desc: 'Strength, weakness, and one action for your next trade' },
              { label: 'Next trade focus', desc: 'Clear, data-backed guidance before every session' },
            ].map((item) => (
              <li key={item.label} className="flex gap-3 items-start">
                <span className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 15 15" fill="none">
                    <path d="M3 7.5L6 10.5L12 4.5" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{item.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4 text-left">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={startTrial}
            disabled={loading}
            className="w-full bg-white text-zinc-950 font-semibold py-3 px-6 rounded-xl hover:bg-zinc-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Redirecting to Stripe...
              </>
            ) : 'Start Free Trial'}
          </button>

          <p className="text-xs text-zinc-600 mt-4">
            No charge for 3 days. Cancel before then and you won&apos;t pay anything.
          </p>
        </div>
      </div>
    </div>
  );
}
