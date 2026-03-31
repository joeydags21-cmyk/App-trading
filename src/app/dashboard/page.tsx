'use client';

import { useEffect, useState } from 'react';
import { Trade } from '@/types';
import { computeStats, buildEquityCurve } from '@/lib/trade-stats';
import { detectPatterns, PatternResult } from '@/lib/patterns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import EquityCurve from '@/components/charts/EquityCurve';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CoachInsight {
  empty: boolean;
  message?: string;
  strength?: string;
  weakness?: string;
  suggestion?: string;
}

// ─── Onboarding steps (shown when no trades) ─────────────────────────────────

const STEPS = [
  {
    num: '1',
    title: 'Add your trades',
    desc: 'Log trades manually or upload a CSV from your broker. No trades = no insights.',
    href: '/trades',
    cta: 'Add trades →',
    altHref: '/trades/import',
    altCta: 'Import CSV',
  },
  {
    num: '2',
    title: 'Set your trading rules',
    desc: 'Tell the app your limits (e.g. max 5 trades/day, max $500 loss/day). AI will check if you break them.',
    href: '/rules',
    cta: 'Set rules →',
  },
  {
    num: '3',
    title: 'Run AI Analysis',
    desc: 'AI scans all your trades and tells you exactly which habits are costing you money — in plain English.',
    href: '/analysis',
    cta: 'Run analysis →',
  },
  {
    num: '4',
    title: 'Get your Daily Report',
    desc: 'At the end of each trading day, generate a report: 3 mistakes and 3 things you did well.',
    href: '/report',
    cta: 'Open report →',
  },
];

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Coach Card ───────────────────────────────────────────────────────────────

function CoachCard() {
  const [insight, setInsight] = useState<CoachInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function getInsight() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/coach');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setInsight(data);
    } catch {
      setError('Could not load coaching insight. Try again in a moment.');
    }
    setLoading(false);
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <path
                d="M7.5 1C4 1 1 4 1 7.5S4 14 7.5 14 14 11 14 7.5 11 1 7.5 1z"
                stroke="#a78bfa"
                strokeWidth="1.2"
              />
              <path
                d="M5.5 6c0-1.1.9-2 2-2s2 .9 2 2c0 .8-.5 1.5-1.2 1.8L8 8.5V10"
                stroke="#a78bfa"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle cx="8" cy="11.5" r=".6" fill="#a78bfa" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Trading Coach</h2>
            <p className="text-xs text-zinc-600">One-click personalised feedback</p>
          </div>
        </div>
        {!loading && (
          <Button size="sm" onClick={getInsight}>
            {insight ? 'Refresh' : 'Get Insight'}
          </Button>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs">
            <Spinner className="w-3.5 h-3.5" />
            Thinking...
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Empty state */}
      {!insight && !loading && !error && (
        <p className="text-sm text-zinc-600">
          Click <span className="text-zinc-400 font-medium">Get Insight</span> for one strength, one weakness, and one thing to focus on for your next trade.
        </p>
      )}

      {/* Empty trades message */}
      {insight?.empty && (
        <p className="text-sm text-zinc-500">{insight.message}</p>
      )}

      {/* Insight result */}
      {insight && !insight.empty && (
        <div className="space-y-3 mt-1">
          <div className="flex gap-3 items-start p-3.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wide w-20 flex-shrink-0 mt-0.5">
              Strength
            </span>
            <p className="text-sm text-zinc-300 leading-relaxed">{insight.strength}</p>
          </div>
          <div className="flex gap-3 items-start p-3.5 bg-red-500/5 rounded-lg border border-red-500/10">
            <span className="text-red-400 text-xs font-semibold uppercase tracking-wide w-20 flex-shrink-0 mt-0.5">
              Weakness
            </span>
            <p className="text-sm text-zinc-300 leading-relaxed">{insight.weakness}</p>
          </div>
          <div className="flex gap-3 items-start p-3.5 bg-violet-500/5 rounded-lg border border-violet-500/10">
            <span className="text-violet-400 text-xs font-semibold uppercase tracking-wide w-20 flex-shrink-0 mt-0.5">
              Next trade
            </span>
            <p className="text-sm text-zinc-300 leading-relaxed">{insight.suggestion}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Patterns Card ────────────────────────────────────────────────────────────

function PatternsCard({ trades }: { trades: Trade[] }) {
  const result: PatternResult = detectPatterns(trades);

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path
              d="M2 12L5.5 7.5L8.5 10L11 6.5L13 8.5"
              stroke="#fbbf24"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="2" cy="12" r="1" fill="#fbbf24" />
            <circle cx="13" cy="8.5" r="1" fill="#fbbf24" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Patterns</h2>
          <p className="text-xs text-zinc-600">Detected from your trade history</p>
        </div>
      </div>

      {/* No patterns yet */}
      {result.patterns.length === 0 && (
        <p className="text-sm text-zinc-600 mb-4">{result.focus}</p>
      )}

      {/* Pattern rows */}
      {result.patterns.length > 0 && (
        <div className="space-y-2.5 mb-4">
          {result.patterns.map((p, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-lg border ${
                p.severity === 'positive'
                  ? 'bg-emerald-500/5 border-emerald-500/10'
                  : 'bg-amber-500/5 border-amber-500/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-semibold ${
                    p.severity === 'positive' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {p.severity === 'positive' ? '↑' : '⚠'} {p.label}
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Focus for next trade */}
      <div className="flex gap-3 items-start pt-3.5 border-t border-zinc-800">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide w-24 flex-shrink-0 mt-0.5">
          Focus next
        </span>
        <p className="text-sm text-zinc-300 leading-relaxed">{result.focus}</p>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trades')
      .then((r) => r.json())
      .then((data) => setTrades(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const stats = computeStats(trades);
  const curve = buildEquityCurve(trades);

  function fmt(n: number) {
    return (
      (n >= 0 ? '+' : '-') +
      '$' +
      Math.abs(n).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-600 text-sm">
        <Spinner />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 mt-1 text-sm">
          {trades.length === 0
            ? 'Welcome — follow the steps below to get started'
            : 'Your trading performance at a glance'}
        </p>
      </div>

      {/* ── EMPTY STATE ── */}
      {trades.length === 0 && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex gap-4 items-start">
            <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 15 15" fill="none">
                <path
                  d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z"
                  stroke="#fbbf24"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">
                You&apos;re all set — here&apos;s how it works
              </p>
              <p className="text-sm text-zinc-500 mt-0.5">
                Futures Edge AI is a{' '}
                <strong className="text-zinc-400">trade journal with AI built in</strong>. Add your
                trades, set your rules, and the AI detects patterns you&apos;d never spot yourself.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STEPS.map((step) => (
              <Card key={step.num} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 bg-zinc-800 text-zinc-400 rounded-md text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {step.num}
                    </span>
                    <span className="text-sm font-semibold text-zinc-200">{step.title}</span>
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed mb-4">{step.desc}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link
                    href={step.href}
                    className="bg-white text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-zinc-100 transition-all"
                  >
                    {step.cta}
                  </Link>
                  {step.altHref && step.altCta && (
                    <Link
                      href={step.altHref}
                      className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 border border-zinc-700 transition-all"
                    >
                      {step.altCta}
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── WITH TRADES ── */}
      {trades.length > 0 && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <p className="text-xs font-medium text-zinc-500 mb-1">Total P&L</p>
              <p
                className={`text-2xl font-bold tracking-tight ${
                  stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {fmt(stats.totalPnl)}
              </p>
              <p className="text-xs text-zinc-600 mt-1">{stats.totalTrades} trades</p>
            </Card>
            <Card>
              <p className="text-xs font-medium text-zinc-500 mb-1">Win Rate</p>
              <p className="text-2xl font-bold tracking-tight text-zinc-100">
                {stats.winRate.toFixed(1)}%
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                {stats.winCount}W / {stats.lossCount}L
              </p>
            </Card>
            <Card>
              <p className="text-xs font-medium text-zinc-500 mb-1">Avg Win</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-400">
                ${stats.avgWin.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-600 mt-1">per winning trade</p>
            </Card>
            <Card>
              <p className="text-xs font-medium text-zinc-500 mb-1">Avg Loss</p>
              <p className="text-2xl font-bold tracking-tight text-red-400">
                ${stats.avgLoss.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-600 mt-1">per losing trade</p>
            </Card>
          </div>

          {/* Coach + Patterns side by side on wider screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CoachCard />
            <PatternsCard trades={trades} />
          </div>

          {/* Equity curve */}
          <Card>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">Equity Curve</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Your running total P&L over time — a flat or upward line is the goal
                </p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {fmt(stats.totalPnl)}
              </span>
            </div>
            <EquityCurve data={curve} />
          </Card>

          {/* Best / Worst day */}
          <div className="grid grid-cols-2 gap-4">
            {stats.bestDay && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-emerald-500/10 rounded-md flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                      <path
                        d="M7.5 2L7.5 13M3 6.5L7.5 2L12 6.5"
                        stroke="#34d399"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">Best Day</span>
                </div>
                <p className="text-xl font-bold text-emerald-400">{fmt(stats.bestDay.pnl)}</p>
                <p className="text-xs text-zinc-600 mt-1">{stats.bestDay.date}</p>
              </Card>
            )}
            {stats.worstDay && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-red-500/10 rounded-md flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                      <path
                        d="M7.5 13L7.5 2M3 8.5L7.5 13L12 8.5"
                        stroke="#f87171"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">Worst Day</span>
                </div>
                <p className="text-xl font-bold text-red-400">{fmt(stats.worstDay.pnl)}</p>
                <p className="text-xs text-zinc-600 mt-1">{stats.worstDay.date}</p>
              </Card>
            )}
          </div>

          {/* Quick actions */}
          <Card className="bg-zinc-900/50">
            <p className="text-xs font-medium text-zinc-500 mb-3">More tools</p>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/analysis"
                className="bg-white text-zinc-950 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-all"
              >
                Full AI Analysis
              </Link>
              <Link
                href="/report"
                className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 border border-zinc-700 transition-all"
              >
                Today&apos;s Report
              </Link>
              <Link
                href="/trades/import"
                className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 border border-zinc-700 transition-all"
              >
                Import CSV
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
