import { Trade, TradeStats } from '@/types';

export function computeStats(trades: Trade[]): TradeStats {
  const safeTrades = Array.isArray(trades) ? trades : [];

  if (safeTrades.length === 0) {
    return {
      totalPnl: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      bestDay: null,
      worstDay: null,
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
    };
  }

  const wins = safeTrades.filter((t) => t.pnl > 0);
  const losses = safeTrades.filter((t) => t.pnl < 0);

  const totalPnl = safeTrades.reduce((sum, t) => sum + t.pnl, 0);
  const winRate = (wins.length / safeTrades.length) * 100;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;

  // Group by date for best/worst day
  const byDate: Record<string, number> = {};
  safeTrades.forEach((t) => {
    byDate[t.date] = (byDate[t.date] || 0) + t.pnl;
  });

  const days = Object.entries(byDate).map(([date, pnl]) => ({ date, pnl }));
  const bestDay = days.length > 0 ? days.reduce((a, b) => (a.pnl > b.pnl ? a : b)) : null;
  const worstDay = days.length > 0 ? days.reduce((a, b) => (a.pnl < b.pnl ? a : b)) : null;

  return {
    totalPnl,
    winRate,
    avgWin,
    avgLoss,
    bestDay,
    worstDay,
    totalTrades: safeTrades.length,
    winCount: wins.length,
    lossCount: losses.length,
  };
}

export function buildEquityCurve(trades: Trade[]): { date: string; equity: number }[] {
  const safeTrades = Array.isArray(trades) ? trades : [];
  const sorted = [...safeTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let running = 0;
  return sorted.map((t) => {
    running += t.pnl;
    return { date: t.date, equity: running };
  });
}
