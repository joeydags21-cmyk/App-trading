'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Trade } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type GoalType = 'daily' | 'weekly' | 'monthly';

interface GoalSettings {
  goal_type: GoalType;
  goal_amount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function getPeriodStart(type: GoalType): string {
  const now = new Date();
  if (type === 'daily') return now.toISOString().slice(0, 10);
  if (type === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 7) + '-01';
}

function getPeriodTrades(trades: Trade[], type: GoalType): Trade[] {
  const start = getPeriodStart(type);
  return trades.filter(t => t.date >= start);
}

function getPaceStatus(pnl: number, goal: number, type: GoalType): 'ahead' | 'on' | 'behind' {
  if (goal <= 0) return 'on';
  const now = new Date();
  let elapsed: number;
  if (type === 'daily') {
    // intraday: hours elapsed / 8 trading hours
    const h = now.getHours();
    elapsed = Math.min(Math.max((h - 9) / 7, 0), 1);
  } else if (type === 'weekly') {
    elapsed = Math.min((now.getDay()) / 5, 1);
  } else {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    elapsed = now.getDate() / days;
  }
  const ratio = pnl / goal;
  if (ratio >= elapsed + 0.1) return 'ahead';
  if (ratio < elapsed - 0.1) return 'behind';
  return 'on';
}

function computeStreak(trades: Trade[], type: GoalType, goal: number): number {
  if (goal <= 0 || trades.length === 0) return 0;

  // Group trades by period
  const byPeriod: Record<string, number> = {};
  for (const t of trades) {
    let key: string;
    if (type === 'daily') key = t.date.slice(0, 10);
    else if (type === 'weekly') {
      const d = new Date(t.date);
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      key = start.toISOString().slice(0, 10);
    } else {
      key = t.date.slice(0, 7);
    }
    byPeriod[key] = (byPeriod[key] ?? 0) + t.pnl;
  }

  const periods = Object.entries(byPeriod).sort((a, b) => b[0].localeCompare(a[0]));
  let streak = 0;
  for (const [, pnl] of periods) {
    if (pnl >= goal) streak++;
    else break;
  }
  return streak;
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────

function Shimmer({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-zinc-800/60 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

// ── Goal type toggle ──────────────────────────────────────────────────────────

const TYPES: GoalType[] = ['daily', 'weekly', 'monthly'];

function GoalTypeToggle({
  value,
  onChange,
}: {
  value: GoalType;
  onChange: (t: GoalType) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex rounded-xl bg-zinc-800/60 p-0.5 gap-0.5">
      {TYPES.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="relative z-10 px-3 py-1 text-xs font-medium capitalize transition-colors rounded-lg"
          style={{ color: value === t ? '#fff' : '#71717a' }}
        >
          {value === t && (
            <motion.div
              layoutId="goalTogglePill"
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600"
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <span className="relative">{t}</span>
        </button>
      ))}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ progress, pace }: { progress: number; pace: 'ahead' | 'on' | 'behind' }) {
  const reduce = useReducedMotion();
  const clampedPct = Math.min(Math.max(progress * 100, 0), 100);
  const color =
    progress >= 1 ? '#10b981' :
    pace === 'ahead' ? '#10b981' :
    pace === 'on' ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="relative h-2 rounded-full bg-zinc-800 overflow-hidden">
      <motion.div
        className="absolute left-0 top-0 h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${clampedPct}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      {progress >= 1 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color, opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

// ── Goal input form ───────────────────────────────────────────────────────────

function GoalForm({
  initial,
  initialType,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initial: string;
  initialType: GoalType;
  saving: boolean;
  error: string;
  onSave: (amount: string, type: GoalType) => void;
  onCancel?: () => void;
}) {
  const [amount, setAmount] = useState(initial);
  const [type, setType] = useState<GoalType>(initialType);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleInput(raw: string) {
    const clean = raw.replace(/[^0-9.]/g, '');
    setAmount(clean);
  }

  return (
    <motion.div
      key="goal-form"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div>
        <p className="text-xs text-zinc-500 mb-3">What's your {type} profit target?</p>
        <GoalTypeToggle value={type} onChange={setType} />
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium pointer-events-none">$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          placeholder="500"
          value={amount}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSave(amount, type)}
          className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl pl-7 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onSave(amount, type)}
          disabled={saving}
          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving…' : 'Set Goal'}
        </motion.button>
        {onCancel && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-sm hover:text-zinc-200 transition-colors"
          >
            Cancel
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface GoalTrackerProps {
  trades: Trade[];
}

export default function GoalTracker({ trades }: GoalTrackerProps) {
  const [settings, setSettings] = useState<GoalSettings | null>(null);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // ── Load goal from browser Supabase client directly (avoids cookie issues) ──

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('goal_settings')
          .select('goal_type, goal_amount')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[GoalTracker] load:', error.message);
          return;
        }

        if (data?.goal_amount != null && data?.goal_type) {
          setSettings({ goal_type: data.goal_type as GoalType, goal_amount: Number(data.goal_amount) });
        }
      } catch (err) {
        console.error('[GoalTracker] load unexpected:', err);
      } finally {
        setFetching(false);
      }
    })();
  }, []);

  // ── Load AI insight whenever settings or trades change ───────────────────

  useEffect(() => {
    if (!settings || trades.length < 3) return;
    setInsightLoading(true);
    fetch('/api/goal-insight')
      .then(r => r.ok ? r.json() : null)
      .then(d => setInsight(d?.insight ?? null))
      .catch(() => setInsight(null))
      .finally(() => setInsightLoading(false));
  }, [settings?.goal_type, settings?.goal_amount, trades.length]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveGoal = useCallback(async (rawAmount: string, type: GoalType) => {
    const goal_amount = parseFloat(rawAmount.replace(/[^0-9.]/g, ''));
    if (!goal_amount || goal_amount <= 0) { setSaveError('Enter a goal greater than $0.'); return; }
    if (goal_amount > 10_000_000) { setSaveError('Goal too large.'); return; }

    setSaving(true);
    setSaveError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaveError('Not signed in.'); return; }

      const { error } = await supabase
        .from('goal_settings')
        .upsert({ user_id: user.id, goal_amount, goal_type: type }, { onConflict: 'user_id' });

      if (error) { setSaveError(error.message); return; }

      setSettings({ goal_type: type, goal_amount });
      setEditing(false);
    } catch (err: any) {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteGoal = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('goal_settings').delete().eq('user_id', user.id);
      setSettings(null);
      setEditing(false);
      setInsight(null);
    } catch (err) {
      console.error('[GoalTracker] delete:', err);
    }
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────

  const periodTrades = useMemo(
    () => settings ? getPeriodTrades(trades, settings.goal_type) : [],
    [trades, settings?.goal_type]
  );

  const periodPnl = useMemo(
    () => periodTrades.reduce((s, t) => s + (isFinite(t.pnl) ? t.pnl : 0), 0),
    [periodTrades]
  );

  const progress = settings && settings.goal_amount > 0
    ? Math.min(periodPnl / settings.goal_amount, 1.5)
    : 0;

  const remaining = settings ? Math.max(settings.goal_amount - periodPnl, 0) : 0;

  const pace = settings ? getPaceStatus(periodPnl, settings.goal_amount, settings.goal_type) : 'on';

  const streak = useMemo(
    () => settings ? computeStreak(trades, settings.goal_type, settings.goal_amount) : 0,
    [trades, settings?.goal_type, settings?.goal_amount]
  );

  const goalHit = progress >= 1;

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (fetching) {
    return (
      <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Shimmer className="h-5 w-32" />
          <Shimmer className="h-7 w-44" />
        </div>
        <Shimmer className="h-2 w-full" />
        <div className="flex gap-3">
          <Shimmer className="h-14 flex-1" />
          <Shimmer className="h-14 flex-1" />
          <Shimmer className="h-14 flex-1" />
        </div>
      </div>
    );
  }

  // ── No goal set ───────────────────────────────────────────────────────────

  if (!settings || editing) {
    return (
      <div
        className="rounded-2xl border border-white/8 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-5"
        style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.06), 0 8px 32px rgba(0,0,0,0.4)' }}
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 bg-violet-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke="#a78bfa" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 tracking-tight">Goal Tracker</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Set a target to start tracking</p>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <GoalForm
            key="new-form"
            initial=""
            initialType="monthly"
            saving={saving}
            error={saveError}
            onSave={saveGoal}
            onCancel={editing ? () => { setEditing(false); setSaveError(''); } : undefined}
          />
        </AnimatePresence>
      </div>
    );
  }

  // ── Full widget ───────────────────────────────────────────────────────────

  const paceColor = goalHit ? 'text-emerald-400' : pace === 'ahead' ? 'text-emerald-400' : pace === 'on' ? 'text-amber-400' : 'text-red-400';
  const paceLabel = goalHit ? 'Goal hit! 🎉' : pace === 'ahead' ? 'Ahead of pace' : pace === 'on' ? 'On pace' : 'Behind pace';
  const label = settings.goal_type.charAt(0).toUpperCase() + settings.goal_type.slice(1);

  return (
    <motion.div
      layout
      className="rounded-2xl border border-white/8 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-5 space-y-4 relative overflow-hidden"
      style={{
        boxShadow: goalHit
          ? '0 0 0 1px rgba(16,185,129,0.25), 0 8px 40px rgba(16,185,129,0.1), 0 0 60px rgba(16,185,129,0.06)'
          : '0 0 0 1px rgba(139,92,246,0.06), 0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${goalHit ? 'bg-emerald-500/15' : 'bg-violet-500/10'}`}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke={goalHit ? '#10b981' : '#a78bfa'} strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 tracking-tight">{label} Goal</h3>
            <p className={`text-xs mt-0.5 font-medium ${paceColor}`}>{paceLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20"
            >
              <span className="text-xs">🔥</span>
              <span className="text-xs font-bold text-orange-400">{streak}</span>
            </motion.div>
          )}
          <button
            onClick={() => { setEditing(true); setSaveError(''); }}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Edit goal"
          >
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <path d="M11.5 1.5L13.5 3.5L5 12H3V10L11.5 1.5Z" stroke="#71717a" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {fmt(periodPnl)} of {fmt(settings.goal_amount)}
          </span>
          <span className={`text-xs font-bold ${paceColor}`}>
            {Math.min(Math.round(progress * 100), 100)}%
          </span>
        </div>
        <ProgressBar progress={progress} pace={pace} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-zinc-500 mb-0.5">P&L</p>
          <p className={`text-sm font-bold ${periodPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(periodPnl)}
          </p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-zinc-500 mb-0.5">Remaining</p>
          <p className="text-sm font-bold text-zinc-200">{goalHit ? '—' : fmt(remaining)}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-zinc-500 mb-0.5">Target</p>
          <p className="text-sm font-bold text-zinc-200">{fmt(settings.goal_amount)}</p>
        </div>
      </div>

      {/* Streak banner */}
      {streak >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/8 border border-orange-500/15"
        >
          <span>🔥</span>
          <p className="text-xs text-orange-300 font-medium">
            {streak}-{settings.goal_type} goal streak — keep it going
          </p>
        </motion.div>
      )}

      {/* AI Insight */}
      <AnimatePresence>
        {(insight || insightLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-2.5 px-3 py-2.5 rounded-xl bg-violet-500/8 border border-violet-500/15"
          >
            <span className="text-violet-400 mt-0.5 flex-shrink-0 text-xs">✦</span>
            {insightLoading ? (
              <Shimmer className="h-3 w-full mt-1" />
            ) : (
              <p className="text-xs text-violet-200 leading-relaxed">{insight}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
