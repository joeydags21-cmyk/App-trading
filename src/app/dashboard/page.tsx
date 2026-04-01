'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Trade } from '@/types';
import { computeStats, buildEquityCurve } from '@/lib/trade-stats';
import { detectPatterns } from '@/lib/patterns';
import EquityCurve from '@/components/charts/EquityCurve';
import GoalTracker from '@/components/GoalTracker';
import Link from 'next/link';
import LockedFeature from '@/components/LockedFeature';

// ─── Animation primitives ─────────────────────────────────────────────────────

const EASE = [0.22, 1, 0.36, 1] as const;

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function HoverCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? {} : { y: -3, boxShadow: '0 16px 48px -8px rgba(0,0,0,0.6)' }}
      transition={{ duration: 0.18 }}
      className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────

function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`rounded-lg bg-zinc-800 animate-pulse ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      {/* Brief skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <Shimmer className="h-3 w-36" />
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-4/5" />
        <Shimmer className="h-14 w-full rounded-xl" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-7 w-24" />
            <Shimmer className="h-3 w-12" />
          </div>
        ))}
      </div>
      {/* Coach skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-16 w-full rounded-xl" />
        <Shimmer className="h-16 w-full rounded-xl" />
        <Shimmer className="h-12 w-full rounded-xl" />
      </div>
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

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  valueClass = 'text-zinc-100',
  delay = 0,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
  delay?: number;
}) {
  return (
    <FadeUp delay={delay}>
      <HoverCard>
        <p className="text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
        <p className="text-xs text-zinc-600 mt-1.5">{sub}</p>
      </HoverCard>
    </FadeUp>
  );
}

// ─── Progress metrics ─────────────────────────────────────────────────────────

function computeProgressMetrics(trades: Trade[]) {
  if (trades.length < 5) return null;

  const sorted = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const allWinRate = (wins.length / trades.length) * 100;

  const recent10 = sorted.slice(-Math.min(10, sorted.length));
  const recent10WinRate =
    (recent10.filter((t) => t.pnl > 0).length / recent10.length) * 100;
  const winRateChange = recent10WinRate - allWinRate;

  const avgWin =
    wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)
      : 0;

  // Consistency score (0–95): R:R (40pts) + improvement (30pts) + win rate (25pts)
  const rrScore =
    avgLoss > 0 ? Math.min(40, Math.round((avgWin / avgLoss) * 20)) : 20;
  const improvScore =
    winRateChange > 5 ? 30 : winRateChange > 0 ? 22 : winRateChange > -10 ? 14 : 8;
  const wrScore = Math.round(Math.min(25, (allWinRate / 100) * 32));
  const consistencyScore = Math.max(15, Math.min(95, rrScore + improvScore + wrScore));

  // Mistake frequency: % of trades that follow a loss and are also losses
  let mistakeTrades = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].pnl < 0 && sorted[i].pnl < 0) mistakeTrades++;
  }
  const mistakeFrequency =
    trades.length > 1
      ? Math.round((mistakeTrades / (trades.length - 1)) * 100)
      : 0;

  return { winRateChange, consistencyScore, mistakeFrequency };
}

function ProgressMetrics({ trades }: { trades: Trade[] }) {
  const m = computeProgressMetrics(trades);
  if (!m) return null;

  const wrChangeColor =
    m.winRateChange >= 3
      ? 'text-emerald-400'
      : m.winRateChange >= -5
      ? 'text-zinc-300'
      : 'text-red-400';

  const mistakeColor =
    m.mistakeFrequency > 35
      ? 'text-red-400'
      : m.mistakeFrequency > 18
      ? 'text-amber-400'
      : 'text-emerald-400';

  const items = [
    {
      label: 'Win Rate Trend',
      value:
        m.winRateChange >= 0
          ? `+${m.winRateChange.toFixed(0)}%`
          : `${m.winRateChange.toFixed(0)}%`,
      sub: 'last 10 vs all-time',
      valueClass: wrChangeColor,
    },
    {
      label: 'Consistency',
      value: `${m.consistencyScore}`,
      sub: 'score / 100',
      valueClass: 'text-zinc-100',
    },
    {
      label: 'Mistake Rate',
      value: `${m.mistakeFrequency}%`,
      sub: 'repeat-loss trades',
      valueClass: mistakeColor,
    },
  ];

  return (
    <FadeUp>
      <div className="grid grid-cols-3 gap-3">
        {items.map(({ label, value, sub, valueClass }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: EASE }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2 leading-tight">
              {label}
            </p>
            <p className={`text-xl font-bold tracking-tight ${valueClass}`}>{value}</p>
            <p className="text-[10px] text-zinc-700 mt-1 leading-tight">{sub}</p>
          </motion.div>
        ))}
      </div>
    </FadeUp>
  );
}

// ─── Today's Trading Brief ────────────────────────────────────────────────────

function TradingBrief({ trades }: { trades: Trade[] }) {
  if (trades.length < 3) return null;

  const result = detectPatterns(trades);
  const topPattern = result.patterns[0] ?? null;

  return (
    <FadeUp>
      <div className="rounded-2xl border border-zinc-800/70 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-5 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Today&apos;s Trading Focus
          </p>
        </div>

        {/* Focus rule */}
        <p className="text-zinc-100 text-[15px] font-medium leading-relaxed mb-4">
          {result.focus}
        </p>

        {/* Detected pattern */}
        {topPattern && (
          <div
            className={`flex gap-3 items-start p-3.5 rounded-xl border ${
              topPattern.severity === 'positive'
                ? 'bg-emerald-500/5 border-emerald-500/15'
                : 'bg-amber-500/5 border-amber-500/15'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-widest flex-shrink-0 mt-0.5 w-16 ${
                topPattern.severity === 'positive'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {topPattern.severity === 'positive' ? 'Edge' : 'Warning'}
            </span>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {topPattern.description}
            </p>
          </div>
        )}
      </div>
    </FadeUp>
  );
}

// ─── Coach Card ───────────────────────────────────────────────────────────────

interface CoachInsight {
  empty: boolean;
  message?: string;
  strength?: string;
  mistake?: string;
  fix?: string;
  nextTrade?: string;
}

function CoachCard({ isPro }: { isPro: boolean }) {
  const [insight, setInsight] = useState<CoachInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function getInsight() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/coach');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to generate coaching insights right now.');
      setInsight(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to generate coaching insights right now.');
    } finally {
      setLoading(false);
    }
  }

  if (!isPro) {
    return (
      <HoverCard>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 bg-violet-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1C4 1 1 4 1 7.5S4 14 7.5 14 14 11 14 7.5 11 1 7.5 1z" stroke="#a78bfa" strokeWidth="1.2"/>
              <path d="M5.5 6c0-1.1.9-2 2-2s2 .9 2 2c0 .8-.5 1.5-1.2 1.8L8 8.5V10" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="8" cy="11.5" r=".6" fill="#a78bfa"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-zinc-200">Trading Coach</h2>
        </div>
        <LockedFeature label="Trading Coach" />
      </HoverCard>
    );
  }

  const rows: { label: string; text: string | undefined; color: string; accent: string }[] = [
    { label: 'Your Edge', text: insight?.strength, color: 'bg-emerald-500/5 border-emerald-500/15', accent: 'text-emerald-400' },
    { label: 'Your Biggest Mistake', text: insight?.mistake, color: 'bg-red-500/5 border-red-500/15', accent: 'text-red-400' },
    { label: 'Fix This Immediately', text: insight?.fix, color: 'bg-orange-500/5 border-orange-500/15', accent: 'text-orange-400' },
    { label: 'On Your Next Trade', text: insight?.nextTrade, color: 'bg-violet-500/5 border-violet-500/15', accent: 'text-violet-400' },
  ].filter((r) => r.text !== undefined);

  return (
    <HoverCard className="!p-0 overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1C4 1 1 4 1 7.5S4 14 7.5 14 14 11 14 7.5 11 1 7.5 1z" stroke="#a78bfa" strokeWidth="1.2"/>
              <path d="M5.5 6c0-1.1.9-2 2-2s2 .9 2 2c0 .8-.5 1.5-1.2 1.8L8 8.5V10" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="8" cy="11.5" r=".6" fill="#a78bfa"/>
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Elite Coaching</h2>
            <p className="text-xs text-zinc-600 mt-0.5">Direct feedback from your numbers</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-xs pt-0.5">
            <Spinner className="w-3.5 h-3.5" /> Analyzing...
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={getInsight}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors"
          >
            {insight ? 'Refresh' : 'Get Insight'}
          </motion.button>
        )}
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        {error && (
          <p className="text-red-400 text-sm mb-3">{error}</p>
        )}

        {!insight && !loading && !error && (
          <p className="text-sm text-zinc-600 py-2">
            Tap <span className="text-zinc-400 font-medium">Get Insight</span> — your coach will name your biggest mistake and tell you exactly what to fix on your next trade.
          </p>
        )}

        {insight?.empty && (
          <p className="text-sm text-zinc-500 py-2">{insight.message}</p>
        )}

        <AnimatePresence>
          {insight && !insight.empty && rows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="space-y-2.5"
            >
              {rows.map(({ label, text, color, accent }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3, ease: EASE }}
                  className={`p-4 rounded-xl border ${color}`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${accent}`}>
                    {label}
                  </p>
                  <p className="text-sm text-zinc-200 leading-relaxed font-medium">{text}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </HoverCard>
  );
}

// ─── Recent trades list ───────────────────────────────────────────────────────

function RecentTrades({ trades }: { trades: Trade[] }) {
  const recent = trades.slice(0, 6);
  function fmt(n: number) {
    return (n >= 0 ? '+' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return (
    <FadeUp>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Recent Trades</h2>
            <p className="text-xs text-zinc-600 mt-0.5">Last {recent.length} of {trades.length}</p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link href="/trades" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-medium">
              View all →
            </Link>
          </motion.div>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60">
                {['Date', 'Symbol', 'Direction', 'Entry', 'Exit', 'P&L'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-zinc-600 px-5 py-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((t, i) => (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-zinc-800/40 last:border-0 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-5 py-3.5 text-zinc-500 text-xs">{t.date}</td>
                  <td className="px-5 py-3.5 text-zinc-200 font-semibold">{t.symbol}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      t.direction === 'long' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {t.direction === 'long' ? '↑ Long' : '↓ Short'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 text-xs font-mono">
                    {t.entry_price != null ? `$${t.entry_price.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 text-xs font-mono">
                    {t.exit_price != null ? `$${t.exit_price.toFixed(2)}` : '—'}
                  </td>
                  <td className={`px-5 py-3.5 font-bold text-sm ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(t.pnl)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-zinc-800/60">
          {recent.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="px-5 py-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-zinc-100">{t.symbol}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    t.direction === 'long' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'
                  }`}>
                    {t.direction === 'long' ? '↑' : '↓'}
                  </span>
                </div>
                <p className="text-xs text-zinc-600">{t.date}</p>
              </div>
              <span className={`text-base font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(t.pnl)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </FadeUp>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const STEPS = [
  { num: '1', title: 'Add your trades', desc: 'Log trades manually or upload a CSV from your broker.', href: '/trades', cta: 'Add trades →', altHref: '/trades/import', altCta: 'Import CSV' },
  { num: '2', title: 'Set your rules', desc: 'Set your daily limits (max trades, max loss). AI checks if you break them.', href: '/rules', cta: 'Set rules →' },
  { num: '3', title: 'Run AI Coach', desc: 'AI scans all trades and tells you exactly which habits are costing you money.', href: '/analysis', cta: 'Run analysis →' },
  { num: '4', title: 'Daily Report', desc: 'End each session with 3 mistakes and 3 things you did right.', href: '/report', cta: 'Open report →' },
];

function EmptyState() {
  return (
    <FadeUp>
      <div className="space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex gap-4 items-start">
          <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke="#fbbf24" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">You&apos;re all set — here&apos;s how it works</p>
            <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">
              Futures Edge AI is a <strong className="text-zinc-400">trade journal with AI built in</strong>. Add trades, set your rules, and the AI detects patterns you&apos;d never spot yourself.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STEPS.map((step, i) => (
            <FadeUp key={step.num} delay={i * 0.07}>
              <HoverCard className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 bg-zinc-800 text-zinc-400 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0">{step.num}</span>
                    <span className="text-sm font-semibold text-zinc-200">{step.title}</span>
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed mb-4">{step.desc}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link href={step.href} className="bg-white text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-zinc-100 transition-all">
                      {step.cta}
                    </Link>
                  </motion.div>
                  {step.altHref && step.altCta && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Link href={step.altHref} className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 border border-zinc-700 transition-all">
                        {step.altCta}
                      </Link>
                    </motion.div>
                  )}
                </div>
              </HoverCard>
            </FadeUp>
          ))}
        </div>
      </div>
    </FadeUp>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [checkoutBanner, setCheckoutBanner] = useState<'success' | 'cancel' | null>(null);
  const [subRefreshing, setSubRefreshing] = useState(false);

  async function fetchSubscription(): Promise<boolean> {
    try {
      const res = await fetch('/api/subscription');
      const data = await res.json();
      return data?.isPro === true;
    } catch { return false; }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    if (checkoutStatus) {
      window.history.replaceState({}, '', window.location.pathname);
      setCheckoutBanner(checkoutStatus === 'success' ? 'success' : 'cancel');
    }

    async function load() {
      let pro = false;
      if (checkoutStatus === 'success') {
        setSubRefreshing(true);
        for (let attempt = 0; attempt < 3; attempt++) {
          pro = await fetchSubscription();
          if (pro) break;
          await new Promise((r) => setTimeout(r, 1000));
        }
        setSubRefreshing(false);
      } else {
        pro = await fetchSubscription();
      }

      const tradesData = await fetch('/api/trades').then((r) => r.json());
      const tradeList = Array.isArray(tradesData) ? tradesData : [];

      const onboardingDone = (() => { try { return !!localStorage.getItem('onboarding_complete'); } catch { return true; } })();
      if (!onboardingDone && tradeList.length === 0 && checkoutStatus !== 'success') {
        router.replace('/onboarding');
        return;
      }

      console.log('USER STATUS:', pro);
      setTrades(tradeList);
      setIsPro(pro);
      setLoading(false);
    }

    load();
  }, []);

  const stats = computeStats(trades);
  const curve = buildEquityCurve(trades);

  function fmt(n: number) {
    return (n >= 0 ? '+' : '-') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-zinc-600 text-sm mb-2">
          <Spinner />
          {subRefreshing ? 'Updating your account...' : 'Loading your dashboard...'}
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <FadeUp>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Pro Dashboard</h1>
              {isPro && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-400 border border-violet-500/25">
                  PRO
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-sm mt-0.5">
              {trades.length === 0
                ? 'Welcome — get started below'
                : 'Your edge. Your mistakes. Your next move.'}
            </p>
          </div>
          {/* Desktop Add Trade — bottom nav FAB handles mobile */}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="hidden sm:block">
            <Link
              href="/trades"
              className="flex items-center gap-2 bg-white text-zinc-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-all text-sm"
            >
              <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Trade
            </Link>
          </motion.div>
        </div>
      </FadeUp>

      {/* ── Mobile Add Trade CTA ── */}
      {trades.length > 0 && (
        <motion.div className="sm:hidden" whileTap={{ scale: 0.97 }}>
          <Link
            href="/trades"
            className="flex items-center justify-center gap-2.5 w-full bg-white text-zinc-950 font-semibold py-4 rounded-2xl text-base shadow-[0_2px_16px_rgba(255,255,255,0.08)]"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            Add Trade
          </Link>
        </motion.div>
      )}

      {/* ── Checkout banners ── */}
      <AnimatePresence>
        {checkoutBanner === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4 flex items-start gap-3"
          >
            <svg className="text-emerald-400 flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 15 15" fill="none">
              <path d="M3 7.5L6 10.5L12 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p className="text-emerald-400 text-sm font-semibold">Free trial started successfully</p>
              <p className="text-emerald-400/70 text-sm mt-0.5">AI Analysis and Trading Coach are now unlocked.</p>
            </div>
          </motion.div>
        )}
        {checkoutBanner === 'cancel' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 flex items-start gap-3"
          >
            <svg className="text-zinc-500 flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1C4 1 1 4 1 7.5S4 14 7.5 14 14 11 14 7.5 11 1 7.5 1z" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7.5 5v4M7.5 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <div>
              <p className="text-zinc-300 text-sm font-semibold">Checkout canceled</p>
              <p className="text-zinc-500 text-sm mt-0.5">No charges made. Start your free trial anytime from AI Coach.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ── */}
      {trades.length === 0 && <EmptyState />}

      {/* ── With trades ── */}
      {trades.length > 0 && (
        <div className="space-y-5">

          {/* Today's Trading Brief — always first */}
          <TradingBrief trades={trades} />

          {/* Monthly Goal Tracker — free for all users */}
          <GoalTracker trades={trades} />

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Total P&L"
              value={fmt(stats.totalPnl)}
              sub={`${stats.totalTrades} trades`}
              valueClass={stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
              delay={0}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              sub={`${stats.winCount}W / ${stats.lossCount}L`}
              delay={0.05}
            />
            <StatCard
              label="Avg Win"
              value={`$${stats.avgWin.toFixed(2)}`}
              sub="per winning trade"
              valueClass="text-emerald-400"
              delay={0.1}
            />
            <StatCard
              label="Avg Loss"
              value={`$${stats.avgLoss.toFixed(2)}`}
              sub="per losing trade"
              valueClass="text-red-400"
              delay={0.15}
            />
          </div>

          {/* Elite Coaching */}
          <FadeUp delay={0.05}>
            <CoachCard isPro={isPro} />
          </FadeUp>

          {/* Progress Metrics */}
          <ProgressMetrics trades={trades} />

          {/* Equity curve */}
          <FadeUp>
            <HoverCard>
              <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200">Equity Curve</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Running total P&L — flat or upward is the goal</p>
                </div>
                <span className={`text-sm font-bold ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(stats.totalPnl)}
                </span>
              </div>
              <EquityCurve data={curve} />
            </HoverCard>
          </FadeUp>

          {/* Best / Worst day */}
          {(stats.bestDay || stats.worstDay) && (
            <div className="grid grid-cols-2 gap-3">
              {stats.bestDay && (
                <FadeUp>
                  <HoverCard>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                        <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
                          <path d="M7.5 2v11M3 6.5L7.5 2l4.5 4.5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-zinc-500">Best Day</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-400">{fmt(stats.bestDay.pnl)}</p>
                    <p className="text-xs text-zinc-600 mt-1">{stats.bestDay.date}</p>
                  </HoverCard>
                </FadeUp>
              )}
              {stats.worstDay && (
                <FadeUp delay={0.05}>
                  <HoverCard>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-red-500/10 rounded-lg flex items-center justify-center">
                        <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
                          <path d="M7.5 13V2M3 8.5L7.5 13l4.5-4.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-zinc-500">Worst Day</span>
                    </div>
                    <p className="text-xl font-bold text-red-400">{fmt(stats.worstDay.pnl)}</p>
                    <p className="text-xs text-zinc-600 mt-1">{stats.worstDay.date}</p>
                  </HoverCard>
                </FadeUp>
              )}
            </div>
          )}

          {/* Recent trades */}
          <RecentTrades trades={trades} />

        </div>
      )}
    </div>
  );
}
