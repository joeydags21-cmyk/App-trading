'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIAnalysis } from '@/types';
import Paywall from '@/components/Paywall';

const ANALYSIS_STEPS = [
  'Reading your trade history...',
  'Identifying patterns...',
  'Building your coaching report...',
];

// ── Shimmer skeleton ──────────────────────────────────────────────────────────

function ShimmerBar({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <motion.div
      className={`${w} ${h} rounded-lg bg-zinc-800 relative overflow-hidden`}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function SkeletonCard({ highlight = false }: { highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-6 space-y-3 ${
        highlight
          ? 'border-violet-500/20 bg-violet-500/5'
          : 'border-zinc-800 bg-zinc-900'
      }`}
    >
      <ShimmerBar w="w-28" h="h-3" />
      <ShimmerBar w="w-full" h="h-4" />
      <ShimmerBar w="w-4/5" h="h-4" />
    </div>
  );
}

// ── Animation helper ──────────────────────────────────────────────────────────

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const style =
    score >= 80
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : score >= 60
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-zinc-400 bg-zinc-800 border-zinc-700';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}
    >
      {score}% confidence
    </span>
  );
}

// ── Coach insight card ────────────────────────────────────────────────────────

function CoachCard({
  label,
  text,
  accent,
  highlight = false,
  delay,
  topRight,
}: {
  label: string;
  text: string;
  accent: string;
  highlight?: boolean;
  delay: number;
  topRight?: React.ReactNode;
}) {
  return (
    <FadeUp delay={delay}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className={`relative rounded-2xl border p-6 ${
          highlight
            ? 'border-violet-500/30 bg-violet-500/5 shadow-[0_0_48px_-12px_rgba(139,92,246,0.25)]'
            : 'border-zinc-800 bg-zinc-900'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <span
            className={`text-xs font-semibold uppercase tracking-widest ${accent}`}
          >
            {label}
          </span>
          {topRight}
        </div>
        <p className="text-zinc-100 text-[15px] leading-relaxed font-medium">
          {text}
        </p>
      </motion.div>
    </FadeUp>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState('');
  const [isPro, setIsPro] = useState<boolean>(false);
  const [subLoading, setSubLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((d) => {
        const pro = d?.isPro === true;
        console.log('USER STATUS:', pro);
        setIsPro(pro);
      })
      .catch(() => {
        console.log('USER STATUS: false (subscription check failed)');
        setIsPro(false);
      })
      .finally(() => setSubLoading(false));
  }, []);

  // Cycle through loading step text
  useEffect(() => {
    if (!loading) { setStepIdx(0); return; }
    const id = setInterval(() => {
      setStepIdx((i) => (i + 1) % ANALYSIS_STEPS.length);
    }, 1600);
    return () => clearInterval(id);
  }, [loading]);

  async function runAnalysis() {
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const res = await fetch('/api/analysis');
      const data = await res.json();

      if (res.status === 403) {
        setIsPro(false);
        setLoading(false);
        return;
      }

      if (data?.error === 'not_enough_trades') {
        setError(data.message);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Analysis failed. Please try again.');
      }

      setAnalysis(data);
    } catch (err: any) {
      setError(
        err?.message ||
          'Analysis failed. Make sure you have at least 3 trades logged.'
      );
    }
    setLoading(false);
  }

  if (subLoading || !isPro) return <Paywall />;

  const winProb = analysis?.winProbability ?? 0;
  const winColor =
    winProb >= 60
      ? 'bg-emerald-500'
      : winProb >= 45
      ? 'bg-amber-400'
      : 'bg-red-500';
  const winTextColor =
    winProb >= 60
      ? 'text-emerald-400'
      : winProb >= 45
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
            AI Coach
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Scans all your trades and tells you exactly what to fix next
          </p>
        </div>
        <motion.button
          onClick={runAnalysis}
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.03 }}
          whileTap={{ scale: loading ? 1 : 0.97 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-zinc-900 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed sm:flex-shrink-0 transition-colors"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Analyzing...
            </>
          ) : analysis ? (
            'Run Again'
          ) : (
            'Run Analysis'
          )}
        </motion.button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4"
          >
            <p className="text-red-400 text-sm font-medium mb-0.5">
              Analysis failed
            </p>
            <p className="text-red-400/70 text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!analysis && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 px-6 py-10 text-center">
            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 15 15" fill="none">
                <path
                  d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z"
                  stroke="#52525b"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-zinc-300 font-semibold mb-1">
              Ready when you are
            </p>
            <p className="text-zinc-500 text-sm">
              Hit Run Analysis — you&apos;ll get 3 coaching insights in about 5
              seconds
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              Works best with 10+ trades logged
            </p>
          </div>

          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-1">
            What you&apos;ll get
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: 'Your Edge',
                desc: 'What you consistently do well — so you can do more of it.',
                accent: 'text-emerald-400',
                border: 'border-zinc-800',
              },
              {
                label: 'Biggest Leak',
                desc: 'The one pattern costing you the most money right now.',
                accent: 'text-red-400',
                border: 'border-zinc-800',
              },
              {
                label: 'Next Trade Focus',
                desc: 'One specific thing to change on your very next trade.',
                accent: 'text-violet-400',
                border: 'border-violet-500/20',
                bg: 'bg-violet-500/5',
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl border ${'bg' in item ? item.bg : 'bg-zinc-900'} ${item.border} p-5`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-widest mb-2 ${item.accent}`}
                >
                  {item.label}
                </p>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1 h-6">
            <svg
              className="animate-spin w-4 h-4 text-zinc-500 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIdx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
                className="text-sm text-zinc-400 font-medium"
              >
                {ANALYSIS_STEPS[stepIdx]}
              </motion.p>
            </AnimatePresence>
          </div>

          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard highlight />

          {/* Win prob skeleton */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
            <ShimmerBar w="w-32" h="h-3" />
            <ShimmerBar w="w-full" h="h-2" />
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="space-y-4">
          {/* Your Edge */}
          <CoachCard
            label="Your Edge"
            text={analysis.edge}
            accent="text-emerald-400"
            delay={0}
            topRight={<ConfidenceBadge score={analysis.confidence} />}
          />

          {/* Biggest Leak */}
          <CoachCard
            label="Biggest Leak"
            text={analysis.biggestLeak}
            accent="text-red-400"
            delay={0.08}
          />

          {/* Next Trade Focus — highlighted as priority */}
          <CoachCard
            label="Next Trade Focus"
            text={analysis.nextTradeFocus}
            accent="text-violet-400"
            highlight
            delay={0.16}
            topRight={
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                <svg width="9" height="9" viewBox="0 0 15 15" fill="currentColor">
                  <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" />
                </svg>
                Priority
              </span>
            }
          />

          {/* Win probability */}
          <FadeUp delay={0.24}>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Win Probability
                </p>
                <span className={`text-sm font-bold ${winTextColor}`}>
                  {winProb}%
                </span>
              </div>
              <div className="bg-zinc-800 rounded-full h-2 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${winColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${winProb}%` }}
                  transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-zinc-600 mt-2">
                Estimated likelihood based on your recent 10 trades
              </p>
            </div>
          </FadeUp>

          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <FadeUp delay={0.32}>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">
                  Risk Flags
                </p>
                <div className="space-y-2.5">
                  {analysis.warnings.map((w, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <svg
                        className="text-amber-400 flex-shrink-0 mt-0.5"
                        width="14"
                        height="14"
                        viewBox="0 0 15 15"
                        fill="none"
                      >
                        <path
                          d="M7.5 2L13.5 12.5H1.5L7.5 2Z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7.5 6v3M7.5 10.5v.5"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                      <p className="text-sm text-amber-300/80">{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          )}

          {/* Rules compliance */}
          {(analysis.rulesAnalysis.violations.length > 0 ||
            analysis.rulesAnalysis.correlations.length > 0) && (
            <FadeUp delay={0.4}>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
                  Rules Compliance
                </p>
                <div className="space-y-3">
                  {analysis.rulesAnalysis.violations.map((v, i) => (
                    <div
                      key={i}
                      className="flex gap-3 items-start p-3 bg-red-500/5 rounded-xl border border-red-500/10"
                    >
                      <svg
                        className="text-red-400 flex-shrink-0 mt-0.5"
                        width="13"
                        height="13"
                        viewBox="0 0 15 15"
                        fill="none"
                      >
                        <path
                          d="M3 3l9 9M12 3l-9 9"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <p className="text-sm text-zinc-400">{v}</p>
                    </div>
                  ))}
                  {analysis.rulesAnalysis.correlations.map((c, i) => (
                    <div
                      key={i}
                      className="flex gap-3 items-start p-3 bg-blue-500/5 rounded-xl border border-blue-500/10"
                    >
                      <svg
                        className="text-blue-400 flex-shrink-0 mt-0.5"
                        width="13"
                        height="13"
                        viewBox="0 0 15 15"
                        fill="none"
                      >
                        <path
                          d="M2 7.5h11M9.5 4l3.5 3.5L9.5 11"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-sm text-zinc-400">{c}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          )}
        </div>
      )}
    </div>
  );
}
