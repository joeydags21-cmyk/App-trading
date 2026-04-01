'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { Trade } from '@/types';

// ── Circular progress ring ────────────────────────────────────────────────────

const RING_SIZE = 148;
const STROKE = 9;
const RADIUS = (RING_SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringColor(p: number) {
  if (p >= 1) return { stroke: '#34d399', glow: '#34d39966' };
  if (p >= 0.7) return { stroke: '#a78bfa', glow: '#a78bfa66' };
  if (p >= 0.4) return { stroke: '#60a5fa', glow: '#60a5fa55' };
  return { stroke: '#f87171', glow: '#f8717155' };
}

function RingProgress({ progress, animate: shouldAnimate }: { progress: number; animate: boolean }) {
  const reduce = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = CIRCUMFERENCE * (1 - clamped);
  const pct = Math.round(clamped * 100);
  const { stroke, glow } = ringColor(clamped);

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#27272a"
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        <motion.circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={shouldAnimate ? { strokeDashoffset: offset } : { strokeDashoffset: offset }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }
          }
          style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold text-zinc-100 tabular-nums"
          key={pct}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.35 }}
        >
          {pct}%
        </motion.span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
          of goal
        </span>
      </div>
    </div>
  );
}

// ── Shimmer bar ───────────────────────────────────────────────────────────────

function ShimmerBar({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) {
  return (
    <motion.div
      className={`${w} ${h} rounded-lg bg-zinc-800`}
      animate={{ opacity: [0.5, 0.75, 0.5] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ── SQL setup card ────────────────────────────────────────────────────────────

const SETUP_SQL = `CREATE TABLE user_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  monthly_goal numeric NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT user_goals_user_id_unique UNIQUE (user_id)
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals"
  ON user_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);`;

function SetupCard() {
  const [copied, setCopied] = useState(false);

  function copySQL() {
    navigator.clipboard.writeText(SETUP_SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 2L13.5 12.5H1.5L7.5 2Z" stroke="#fbbf24" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M7.5 6v3M7.5 10.5v.5" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">Monthly Goal Tracker — Setup Required</h3>
      </div>
      <p className="text-sm text-zinc-500 mb-3 leading-relaxed">
        Run this SQL in your <strong className="text-zinc-400">Supabase SQL Editor</strong> to enable goal tracking:
      </p>
      <div className="relative">
        <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 overflow-x-auto leading-relaxed font-mono whitespace-pre">
          {SETUP_SQL}
        </pre>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={copySQL}
          className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </motion.button>
      </div>
    </div>
  );
}

// ── Goal input form ───────────────────────────────────────────────────────────

function GoalForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: string;
  onSave: (val: string) => void;
  onCancel?: () => void;
  saving: boolean;
  error: string;
}) {
  const [input, setInput] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 bg-violet-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke="#a78bfa" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Monthly Profit Goal</h3>
          <p className="text-xs text-zinc-600 mt-0.5">Track your progress every day</p>
        </div>
      </div>

      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium pointer-events-none">
            $
          </span>
          <input
            ref={inputRef}
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !saving && onSave(input)}
            placeholder="e.g. 5000"
            min="1"
            step="100"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-8 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all appearance-none"
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onSave(input)}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {saving ? 'Saving…' : onCancel ? 'Update' : 'Set Goal'}
        </motion.button>
        {onCancel && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onCancel}
            className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm font-medium border border-zinc-700 hover:bg-zinc-700 transition-colors flex-shrink-0"
          >
            Cancel
          </motion.button>
        )}
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      {!onCancel && (
        <p className="text-xs text-zinc-600 mt-3">
          Set a monthly profit target. We&apos;ll track your daily pace and give you a focused
          coaching cue.
        </p>
      )}
    </motion.div>
  );
}

// ── Pace + feedback ───────────────────────────────────────────────────────────

function getPaceStatus(
  totalProfit: number,
  goal: number,
  tradesCount: number
): 'no-trades' | 'ahead' | 'on-track' | 'behind' {
  if (tradesCount === 0) return 'no-trades';
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const elapsed = today.getDate() / daysInMonth;
  const actual = goal > 0 ? totalProfit / goal : 0;
  if (actual >= elapsed + 0.1) return 'ahead';
  if (actual < elapsed - 0.1) return 'behind';
  return 'on-track';
}

const FEEDBACK: Record<string, { label: string; text: string; bg: string; border: string; accent: string }> = {
  'no-trades': {
    label: 'No data',
    text: 'Add trades to start tracking your monthly progress.',
    bg: 'bg-zinc-800/50',
    border: 'border-zinc-700/60',
    accent: 'text-zinc-500',
  },
  ahead: {
    label: 'Ahead',
    text: "You're ahead of your target — stay disciplined and don't get overconfident.",
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/15',
    accent: 'text-emerald-400',
  },
  'on-track': {
    label: 'On pace',
    text: "You're on pace. Stay consistent and stick to your setups.",
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/15',
    accent: 'text-blue-400',
  },
  behind: {
    label: 'Behind',
    text: "You're slightly behind — don't force trades. Focus on execution, not outcome.",
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/15',
    accent: 'text-amber-400',
  },
};

// ── Main component ────────────────────────────────────────────────────────────

interface GoalTrackerProps {
  trades: Trade[];
}

export default function GoalTracker({ trades }: GoalTrackerProps) {
  const [goal, setGoal] = useState<number | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [saveError, setSaveError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-20px' });

  // Fetch goal once on mount
  useEffect(() => {
    fetch('/api/goals')
      .then((r) => r.json())
      .then((d) => {
        if (d._table_missing) {
          setTableMissing(true);
        } else {
          setGoal(d.monthly_goal != null ? Number(d.monthly_goal) : null);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  // Filter to current calendar month — goal tracker is monthly
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const thisMonthTrades = trades.filter((t) => t.date.startsWith(currentMonth));
  const totalProfit = thisMonthTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  // Safe calculations
  const progress = goal != null && goal > 0 ? totalProfit / goal : 0;
  const dailyTarget = goal != null && goal > 0 ? goal / 20 : null;
  const pace = goal != null && goal > 0
    ? getPaceStatus(totalProfit, goal, thisMonthTrades.length)
    : 'no-trades';
  const feedback = FEEDBACK[pace];

  const saveGoal = useCallback(
    async (inputVal: string) => {
      const val = parseFloat(inputVal.replace(/,/g, ''));
      if (!inputVal.trim() || isNaN(val) || val <= 0) {
        setSaveError('Enter a valid goal amount.');
        return;
      }
      setSaving(true);
      setSaveError('');
      try {
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthly_goal: val }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'table_missing') {
            setTableMissing(true);
          } else {
            setSaveError(data.error ?? 'Failed to save. Try again.');
          }
          return;
        }
        setGoal(Number(data.monthly_goal));
        setEditing(false);
      } catch {
        setSaveError('Failed to save. Try again.');
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const clearGoal = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/goals', { method: 'DELETE' });
      setGoal(null);
    } catch {}
    setSaving(false);
  }, []);

  function fmtMoney(n: number, signed = true) {
    const abs = '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (!signed) return abs;
    return (n >= 0 ? '+' : '−') + abs;
  }

  const today = new Date();
  const monthLabel = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (fetching) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <ShimmerBar w="w-7 h-7 rounded-xl" h="" />
          <ShimmerBar w="w-44" h="h-3.5" />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ShimmerBar w="w-36 h-36 rounded-full" h="" />
          <div className="flex-1 w-full space-y-3.5">
            <ShimmerBar w="w-full" h="h-4" />
            <ShimmerBar w="w-4/5" h="h-4" />
            <ShimmerBar w="w-full" h="h-4" />
          </div>
        </div>
      </div>
    );
  }

  // ── Table not set up ───────────────────────────────────────────────────────

  if (tableMissing) return <SetupCard />;

  // ── No goal / editing ──────────────────────────────────────────────────────

  if (!goal || editing) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <AnimatePresence mode="wait">
          <GoalForm
            key="form"
            initial={editing && goal ? String(goal) : ''}
            onSave={saveGoal}
            onCancel={editing ? () => { setEditing(false); setSaveError(''); } : undefined}
            saving={saving}
            error={saveError}
          />
        </AnimatePresence>
      </div>
    );
  }

  // ── Goal set — full tracker ────────────────────────────────────────────────

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <path
                d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z"
                stroke="#a78bfa"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Monthly Profit Goal</h3>
            <p className="text-xs text-zinc-600 mt-0.5">{monthLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { setEditing(true); setSaveError(''); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
          >
            Edit
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={clearGoal}
            disabled={saving}
            className="text-xs text-zinc-700 hover:text-red-400 transition-colors font-medium disabled:opacity-40"
          >
            Clear
          </motion.button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row items-center gap-6">

          {/* Circular ring — only animates when in view */}
          <RingProgress progress={progress} animate={inView} />

          {/* Metrics */}
          <div className="flex-1 w-full">
            {[
              {
                label: 'Monthly Goal',
                value: fmtMoney(goal, false),
                valueClass: 'text-zinc-100',
                hint: null,
              },
              {
                label: 'Daily Target',
                value: dailyTarget != null ? fmtMoney(dailyTarget, false) : '—',
                valueClass: 'text-zinc-100',
                hint: '÷ 20 trading days',
              },
              {
                label: 'This Month',
                value: fmtMoney(totalProfit),
                valueClass: totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
                hint:
                  thisMonthTrades.length === 0
                    ? 'No trades yet this month'
                    : `${thisMonthTrades.length} trade${thisMonthTrades.length === 1 ? '' : 's'}`,
              },
            ].map(({ label, value, valueClass, hint }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -6 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.35 }}
                className="flex items-center justify-between py-2.5 border-b border-zinc-800/50 last:border-0"
              >
                <p className="text-xs text-zinc-500">{label}</p>
                <div className="text-right">
                  <p className={`text-sm font-bold tabular-nums ${valueClass}`}>{value}</p>
                  {hint && <p className="text-[10px] text-zinc-700 mt-0.5">{hint}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pace / AI feedback */}
        <AnimatePresence>
          {inView && (
            <motion.div
              key={pace}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.65, duration: 0.4 }}
              className={`mt-4 flex gap-3 items-start p-3.5 rounded-xl border ${feedback.bg} ${feedback.border}`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-widest flex-shrink-0 mt-0.5 w-16 ${feedback.accent}`}
              >
                {feedback.label}
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed">{feedback.text}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
