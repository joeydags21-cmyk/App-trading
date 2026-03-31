import { Trade } from '@/types';

export interface Pattern {
  label: string;
  description: string;
  severity: 'positive' | 'warning';
}

export interface PatternResult {
  patterns: Pattern[];
  focus: string;
}

export function detectPatterns(trades: Trade[]): PatternResult {
  const safeTrades = Array.isArray(trades) ? trades : [];

  if (safeTrades.length < 3) {
    return {
      patterns: [],
      focus: 'Add at least 3 trades to unlock pattern detection.',
    };
  }

  const sorted = [...safeTrades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const wins = safeTrades.filter((t) => t.pnl > 0);
  const losses = safeTrades.filter((t) => t.pnl < 0);
  const winRate = (wins.length / safeTrades.length) * 100;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)
      : 0;

  const patterns: Pattern[] = [];

  // --- 1. Current streak ---
  const lastTrade = sorted[sorted.length - 1];
  const lastIsWin = lastTrade.pnl > 0;
  let streak = 1;
  for (let i = sorted.length - 2; i >= 0; i--) {
    const sameOutcome = lastIsWin ? sorted[i].pnl > 0 : sorted[i].pnl < 0;
    if (sameOutcome) streak++;
    else break;
  }

  if (streak >= 2) {
    if (lastIsWin) {
      patterns.push({
        label: `${streak}-trade win streak`,
        description: `You've won your last ${streak} trades in a row. Momentum is on your side — stay disciplined and don't oversize.`,
        severity: 'positive',
      });
    } else {
      patterns.push({
        label: `${streak}-trade loss streak`,
        description: `You've lost your last ${streak} trades in a row. This is a common trigger for revenge trading — pause before your next entry.`,
        severity: 'warning',
      });
    }
  }

  // --- 2. Loss size vs win size ---
  if (avgWin > 0 && avgLoss > avgWin * 1.5) {
    patterns.push({
      label: 'Losses are outrunning wins',
      description: `Your average loss ($${avgLoss.toFixed(0)}) is ${(avgLoss / avgWin).toFixed(1)}x your average win ($${avgWin.toFixed(0)}). Cutting losses faster would improve your P&L even without changing your win rate.`,
      severity: 'warning',
    });
  }

  // --- 3. Strong win rate (only if not already 2 patterns) ---
  if (patterns.length < 2 && winRate >= 60 && safeTrades.length >= 8) {
    patterns.push({
      label: `${winRate.toFixed(0)}% win rate`,
      description: `You're winning more than 6 in 10 trades. Your edge is showing — focus on letting winners run a little further to maximise it.`,
      severity: 'positive',
    });
  }

  // --- 4. Low win rate (only if not already 2 patterns) ---
  if (patterns.length < 2 && winRate < 40 && safeTrades.length >= 8) {
    patterns.push({
      label: `Low win rate (${winRate.toFixed(0)}%)`,
      description: `Fewer than 4 in 10 trades are winners. Consider tightening your entry criteria — being more selective is usually more profitable than trading more.`,
      severity: 'warning',
    });
  }

  // --- 5. Overtrading on down days (only if not already 2 patterns) ---
  if (patterns.length < 2) {
    const byDate: Record<string, { count: number; pnl: number }> = {};
    safeTrades.forEach((t) => {
      if (!byDate[t.date]) byDate[t.date] = { count: 0, pnl: 0 };
      byDate[t.date].count++;
      byDate[t.date].pnl += t.pnl;
    });
    const dayValues = Object.values(byDate);
    const avgPerDay =
      dayValues.length > 0
        ? dayValues.reduce((s, d) => s + d.count, 0) / dayValues.length
        : 0;
    const lossDays = dayValues.filter((d) => d.pnl < 0);
    const overtradedLossDays = lossDays.filter((d) => d.count > avgPerDay * 1.5).length;

    if (lossDays.length >= 3 && overtradedLossDays / lossDays.length > 0.5) {
      patterns.push({
        label: 'Overtrading on losing days',
        description: `On most of your losing days you trade well above your daily average. More trades on a bad day tend to make it worse, not better.`,
        severity: 'warning',
      });
    }
  }

  // --- Focus message ---
  const onLossStreak = !lastIsWin && streak >= 2;
  const bigLosses = avgLoss > avgWin * 1.5;

  let focus = 'Stay consistent — execute your plan and avoid impulsive entries.';

  if (!lastIsWin && streak >= 3) {
    focus =
      'Step back before your next trade. Three losses in a row is a signal to pause, review, and reset — not push harder.';
  } else if (onLossStreak) {
    focus =
      'Wait for a genuinely clear setup before entering. The urge to recover a loss quickly leads to more losses.';
  } else if (bigLosses) {
    focus =
      "Your biggest lever is cutting losses faster. Set your stop before entry and honour it — don't move it.";
  } else if (lastIsWin && streak >= 3) {
    focus =
      "You're in good rhythm. Protect it by sticking to your normal position size — don't bet big because you're on a streak.";
  } else if (winRate >= 60) {
    focus =
      'Win rate is strong. Shift attention to holding winning trades a little longer — your edge grows when you let profits breathe.';
  }

  return {
    patterns: patterns.slice(0, 2),
    focus,
  };
}
