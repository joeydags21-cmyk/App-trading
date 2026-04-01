export interface Trade {
  id: string;
  user_id: string;
  date: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number | null;
  exit_price: number | null;
  pnl: number;
  notes: string | null;
  created_at: string;
}

export interface TradeStats {
  totalPnl: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  totalTrades: number;
  winCount: number;
  lossCount: number;
}

export interface Rules {
  id: string;
  user_id: string;
  max_trades_per_day: number | null;
  max_loss_per_day: number | null;
  max_position_size: number | null;
}

export interface AIInsight {
  type: 'warning' | 'info' | 'critical';
  title: string;
  description: string;
}

export interface AIAnalysis {
  edge: string;
  biggestLeak: string;
  nextTradeFocus: string;
  confidence: number;
  winProbability: number;
  warnings: string[];
  rulesAnalysis: {
    violations: string[];
    correlations: string[];
  };
}
