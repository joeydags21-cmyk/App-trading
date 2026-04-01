'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TradeForm {
  date: string;
  symbol: string;
  direction: 'long' | 'short';
  pnl: string;
  notes: string;
}

interface Insight {
  empty: boolean;
  strength: string | null;
  weakness: string | null;
  suggestion: string | null;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current ? 'bg-white flex-1' : i === current ? 'bg-white/60 flex-1' : 'bg-zinc-800 flex-1'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Input styles ─────────────────────────────────────────────────────────────

const input = 'w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-500 transition-all';
const label = 'block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5';

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 2 — personalization
  const [style, setStyle] = useState('');
  const [goal, setGoal] = useState('');

  // Step 3 — trade entry
  const [form, setForm] = useState<TradeForm>({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    direction: 'long',
    pnl: '',
    notes: '',
  });
  const [tradeError, setTradeError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 4 — results
  const [insight, setInsight] = useState<Insight | null>(null);
  const [isPro, setIsPro] = useState(false);

  function setField(field: keyof TradeForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function markOnboardingDone() {
    try { localStorage.setItem('onboarding_complete', '1'); } catch {}
  }

  async function submitTrade() {
    setTradeError('');

    if (!form.symbol.trim()) { setTradeError('Symbol is required.'); return; }
    if (form.pnl === '' || isNaN(parseFloat(form.pnl))) { setTradeError('P&L is required.'); return; }

    setSubmitting(true);
    try {
      const [res, subRes] = await Promise.all([
        fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trade: {
              date: form.date,
              symbol: form.symbol.trim(),
              direction: form.direction,
              pnl: parseFloat(form.pnl),
              notes: form.notes.trim() || null,
            },
            style,
            goal,
          }),
        }),
        fetch('/api/subscription').then((r) => r.json()),
      ]);

      const data = await res.json();

      if (!res.ok) {
        setTradeError(data?.error || 'Unable to save trade. Please try again.');
        setSubmitting(false);
        return;
      }

      setInsight(data.insight);
      setIsPro(subRes?.isPro === true);
      markOnboardingDone();
      setStep(3);
    } catch {
      setTradeError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 0: Welcome ─────────────────────────────────────────────────────────
  const stepWelcome = (
    <div className="flex flex-col items-center text-center">
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <svg width="26" height="26" viewBox="0 0 15 15" fill="none">
          <path d="M2 12L6 7L9 10L13 4" stroke="#09090b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-3">
        Welcome to Futures Edge AI
      </h1>
      <p className="text-zinc-500 text-sm leading-relaxed mb-8 max-w-xs">
        In the next 60 seconds, you'll log your first trade and get instant AI feedback on what you're doing right — and what to fix.
      </p>
      <div className="space-y-3 w-full mb-8 text-left">
        {[
          { icon: '📊', text: 'Log one trade from memory' },
          { icon: '🤖', text: 'AI gives you instant feedback' },
          { icon: '🎯', text: 'Get your first coaching insight' },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-zinc-800">
            <span className="text-base">{item.icon}</span>
            <span className="text-sm text-zinc-300">{item.text}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => setStep(1)}
        className="w-full bg-white text-zinc-950 font-semibold py-3 rounded-xl hover:bg-zinc-100 transition-all text-sm"
      >
        Let's go →
      </button>
      <Link href="/dashboard" className="mt-4 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
        Skip setup, go to dashboard
      </Link>
    </div>
  );

  // ── Step 1: Personalization ─────────────────────────────────────────────────
  const styles = ['Day trader', 'Swing trader', 'Scalper', 'Position trader'];
  const goals = ['Cut my losses faster', 'Improve win rate', 'Be more consistent', 'Manage emotions better'];

  const stepPersonalize = (
    <div>
      <h2 className="text-xl font-bold text-zinc-100 tracking-tight mb-1">Quick setup</h2>
      <p className="text-zinc-500 text-sm mb-7">2 questions so the AI knows how to coach you.</p>

      <div className="mb-6">
        <p className={label}>I trade as a...</p>
        <div className="grid grid-cols-2 gap-2">
          {styles.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                style === s
                  ? 'bg-white text-zinc-950 border-white'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className={label}>My main goal is to...</p>
        <div className="grid grid-cols-1 gap-2">
          {goals.map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all text-left ${
                goal === g
                  ? 'bg-white text-zinc-950 border-white'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setStep(2)}
        disabled={!style || !goal}
        className="w-full bg-white text-zinc-950 font-semibold py-3 rounded-xl hover:bg-zinc-100 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue →
      </button>
    </div>
  );

  // ── Step 2: Trade entry ─────────────────────────────────────────────────────
  const stepTrade = (
    <div>
      <h2 className="text-xl font-bold text-zinc-100 tracking-tight mb-1">Log your first trade</h2>
      <p className="text-zinc-500 text-sm mb-6">Think of a recent trade — even from memory is fine.</p>

      {tradeError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-400 text-sm">{tradeError}</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Date</label>
            <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Symbol</label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setField('symbol', e.target.value)}
              className={input}
              placeholder="ES, NQ, CL..."
            />
          </div>
        </div>

        <div>
          <label className={label}>Direction</label>
          <div className="grid grid-cols-2 gap-2">
            {(['long', 'short'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setField('direction', d)}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  form.direction === d
                    ? d === 'long'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/40'
                      : 'bg-orange-500/10 text-orange-400 border-orange-500/40'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {d === 'long' ? '↑ Long' : '↓ Short'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>P&amp;L ($) — required</label>
          <input
            type="number"
            step="0.01"
            value={form.pnl}
            onChange={(e) => setField('pnl', e.target.value)}
            className={input}
            placeholder="-250.00 or 180.00"
          />
        </div>

        <div>
          <label className={label}>What happened? <span className="normal-case font-normal text-zinc-600">(optional)</span></label>
          <textarea
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            className={`${input} h-16 resize-none`}
            placeholder="FOMO? Followed your plan? Revenge trade?"
          />
        </div>
      </div>

      <button
        onClick={submitTrade}
        disabled={submitting}
        className="w-full bg-white text-zinc-950 font-semibold py-3 rounded-xl hover:bg-zinc-100 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Spinner className="w-4 h-4" />
            Analyzing your trade...
          </>
        ) : 'Get AI feedback →'}
      </button>
    </div>
  );

  // ── Step 3: Results + paywall ───────────────────────────────────────────────
  const stepResults = (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
            <path d="M3 7.5L6 10.5L12 4.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Your first insight</h2>
      </div>

      {insight && !insight.empty ? (
        <div className="space-y-3 mb-6">
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">Strength</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{insight.strength}</p>
          </div>
          <div className="p-4 bg-red-500/5 border border-red-500/15 rounded-xl">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1.5">Watch out for</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{insight.weakness}</p>
          </div>
          <div className="p-4 bg-violet-500/5 border border-violet-500/15 rounded-xl">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-1.5">Next trade focus</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{insight.suggestion}</p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl mb-6">
          <p className="text-sm text-zinc-400">Your trade was saved. Add more trades to unlock AI insights.</p>
        </div>
      )}

      {/* Paywall gate */}
      {!isPro ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <div className="w-9 h-9 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <rect x="2" y="6" width="11" height="8" rx="1.5" stroke="#a78bfa" strokeWidth="1.3"/>
              <path d="M5 6V4.5a2.5 2.5 0 015 0V6" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-zinc-100 mb-1.5">Stop repeating the same trading mistakes.</p>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            Futures Edge AI analyzes every trade and tells you exactly what to fix next.
          </p>
          <ul className="space-y-2 mb-5 text-left">
            {[
              'Know your biggest mistake instantly',
              'Get one clear focus for your next trade',
              'Build consistency faster',
            ].map((item) => (
              <li key={item} className="flex gap-2 items-center">
                <span className="w-3.5 h-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center justify-center flex-shrink-0">
                  <svg width="7" height="7" viewBox="0 0 15 15" fill="none">
                    <path d="M3 7.5L6 10.5L12 4.5" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="text-xs text-zinc-300">{item}</span>
              </li>
            ))}
          </ul>
          <StartTrialButton />
          <p className="text-xs text-zinc-600 mt-2.5">3-day free trial &bull; Cancel anytime</p>
          <p className="text-xs text-zinc-700 mt-4 pt-4 border-t border-zinc-800">Built for serious traders improving their edge daily.</p>
        </div>
      ) : (
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-white text-zinc-950 font-semibold py-3 rounded-xl hover:bg-zinc-100 transition-all text-sm"
        >
          Go to dashboard →
        </button>
      )}

      <button
        onClick={() => router.push('/dashboard')}
        className="w-full mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
      >
        Skip for now, go to dashboard
      </button>
    </div>
  );

  const steps = [stepWelcome, stepPersonalize, stepTrade, stepResults];
  const totalSteps = steps.length;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center pt-12 px-5 pb-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <path d="M2 12L6 7L9 10L13 4" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-zinc-300 text-sm">Futures Edge AI</span>
        </div>

        <Steps current={step} total={totalSteps} />

        {steps[step]}
      </div>
    </div>
  );
}

// ─── Stripe CTA (isolated to handle its own loading state) ────────────────────

function StartTrialButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function start() {
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
    <>
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      <button
        onClick={start}
        disabled={loading}
        className="w-full bg-white text-zinc-950 font-semibold py-2.5 rounded-xl hover:bg-zinc-100 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Redirecting to Stripe...
          </>
        ) : 'Start 3-Day Free Trial'}
      </button>
    </>
  );
}
