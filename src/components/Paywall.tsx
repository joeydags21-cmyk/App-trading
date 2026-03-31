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
      if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || 'Unable to start checkout. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[55vh]">
      <div className="max-w-sm w-full mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">

          {/* Lock icon */}
          <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center mb-5">
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
              <rect x="2" y="6" width="11" height="8" rx="1.5" stroke="#a78bfa" strokeWidth="1.3" />
              <path d="M5 6V4.5a2.5 2.5 0 015 0V6" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>

          {/* Headline */}
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight mb-1">
            Unlock Your Trading Edge
          </h2>
          <p className="text-zinc-500 text-sm mb-6">
            Get AI-powered insights and coaching
          </p>

          {/* Features */}
          <ul className="space-y-2.5 mb-7">
            {[
              'AI finds your mistakes — automatically',
              'Tells you exactly what to fix next trade',
              'Personalized coaching based on your data',
            ].map((item) => (
              <li key={item} className="flex gap-2.5 items-center">
                <span className="w-4 h-4 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center justify-center flex-shrink-0">
                  <svg width="8" height="8" viewBox="0 0 15 15" fill="none">
                    <path d="M3 7.5L6 10.5L12 4.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-sm text-zinc-300">{item}</span>
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={startTrial}
            disabled={loading}
            className="w-full bg-white text-zinc-950 font-semibold py-2.5 px-6 rounded-xl hover:bg-zinc-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
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

          <p className="text-xs text-zinc-600 mt-3 text-center">
            3 days free — $19/month after. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
