import Anthropic from '@anthropic-ai/sdk';
import { Trade, AIAnalysis } from '@/types';

const client = new Anthropic();

export async function analyzeTradesWithAI(trades: Trade[], rules?: {
  max_trades_per_day?: number | null;
  max_loss_per_day?: number | null;
  max_position_size?: number | null;
}): Promise<AIAnalysis> {
  const safeTrades = Array.isArray(trades) ? trades : [];

  if (safeTrades.length === 0) {
    return {
      insights: [{ type: 'info', title: 'No trades yet', description: 'Import or add trades to get AI analysis.' }],
      nextTradePrediction: { winProbability: 50, warnings: [], summary: 'Not enough data for prediction.' },
      rulesAnalysis: { violations: [], correlations: [] },
    };
  }

  const tradeSummary = buildTradeSummary(safeTrades);

  const prompt = `You are a trading performance analyst for futures traders. Analyze this trader's data and return a JSON object.

TRADE DATA:
${tradeSummary}

${rules ? `TRADER'S RULES:
- Max trades per day: ${rules.max_trades_per_day ?? 'not set'}
- Max loss per day: $${rules.max_loss_per_day ?? 'not set'}
- Max position size: ${rules.max_position_size ?? 'not set'} contracts` : ''}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "insights": [
    {
      "type": "warning|info|critical",
      "title": "Short insight title",
      "description": "Plain English description. Use phrases like 'You tend to...', 'Historically, you...', 'Your data shows...'"
    }
  ],
  "nextTradePrediction": {
    "winProbability": <number 0-100 based on recent performance>,
    "warnings": ["warning string 1", "warning string 2"],
    "summary": "2-3 sentence summary using language like 'Statistically, you are more likely to...' or 'Based on your recent trades...'"
  },
  "rulesAnalysis": {
    "violations": ["violation description"],
    "correlations": ["correlation between rule-breaking and losses"]
  }
}

Generate 5-8 insights. Focus on:
- Consecutive loss behavior (revenge trading?)
- Win/loss ratio analysis
- Overtrading patterns
- Symbol-specific performance (which symbols win vs lose?)
- Daily trade count patterns

IMPORTANT: Never claim certainty. Never promise profits. Focus on behavioral patterns only.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const analysis: AIAnalysis = JSON.parse(content.text);
  return analysis;
}

export async function generateDailyReport(trades: Trade[], todayTrades: Trade[]): Promise<string> {
  const safeTrades = Array.isArray(trades) ? trades : [];
  const safeTodayTrades = Array.isArray(todayTrades) ? todayTrades : [];

  if (safeTodayTrades.length === 0) {
    return "No trades recorded today. Take it one day at a time — consistency builds over time.";
  }

  const todayPnl = safeTodayTrades.reduce((s, t) => s + t.pnl, 0);
  const todayWins = safeTodayTrades.filter((t) => t.pnl > 0).length;
  const historicalAvgPnl = safeTrades.length > 0
    ? safeTrades.reduce((s, t) => s + t.pnl, 0) / safeTrades.length
    : 0;

  const prompt = `You are a trading coach. Generate a brief daily performance report for a futures trader.

TODAY'S DATA:
- Trades taken: ${safeTodayTrades.length}
- P&L: $${todayPnl.toFixed(2)}
- Wins: ${todayWins} / ${safeTodayTrades.length}
- Symbols traded: ${Array.from(new Set(safeTodayTrades.map(t => t.symbol))).join(', ')}
- Historical avg trade PnL: $${historicalAvgPnl.toFixed(2)}

Write a brief, honest, supportive report with:
1. A 1-sentence performance summary
2. Exactly 3 mistakes or areas to improve (be specific)
3. Exactly 3 things done well or to keep doing

Use plain English. Be direct but not harsh. Format it clearly with headers.
Focus on behavior and process, not outcomes. Never promise future profits.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return content.text;
}

function buildTradeSummary(trades: Trade[]): string {
  const safeTrades = Array.isArray(trades) ? trades : [];

  const wins = safeTrades.filter((t) => t.pnl > 0);
  const losses = safeTrades.filter((t) => t.pnl < 0);
  const totalPnl = safeTrades.reduce((s, t) => s + t.pnl, 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;

  // Consecutive loss analysis
  const sortedTrades = [...safeTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let maxConsecLosses = 0;
  let consecLossCount = 0;
  sortedTrades.forEach((t) => {
    if (t.pnl < 0) {
      consecLossCount++;
      maxConsecLosses = Math.max(maxConsecLosses, consecLossCount);
    } else {
      consecLossCount = 0;
    }
  });

  // Trades by day count
  const byDate: Record<string, number> = {};
  safeTrades.forEach((t) => { byDate[t.date] = (byDate[t.date] || 0) + 1; });
  const dateValues = Object.values(byDate);
  const avgTradesPerDay = dateValues.length > 0
    ? dateValues.reduce((s, c) => s + c, 0) / dateValues.length
    : 0;
  const maxTradesInDay = dateValues.length > 0 ? Math.max(...dateValues) : 0;

  // Symbol breakdown
  const symbolPnl: Record<string, number> = {};
  safeTrades.forEach((t) => {
    symbolPnl[t.symbol] = (symbolPnl[t.symbol] || 0) + t.pnl;
  });

  return `Total trades: ${safeTrades.length}
Total P&L: $${totalPnl.toFixed(2)}
Win rate: ${safeTrades.length > 0 ? ((wins.length / safeTrades.length) * 100).toFixed(1) : '0.0'}%
Avg win: $${avgWin.toFixed(2)} | Avg loss: $${avgLoss.toFixed(2)}
Win/loss ratio: ${avgLoss !== 0 ? (Math.abs(avgWin / avgLoss)).toFixed(2) : 'N/A'}
Max consecutive losses: ${maxConsecLosses}
Avg trades per day: ${avgTradesPerDay.toFixed(1)}
Max trades in one day: ${maxTradesInDay}
P&L by symbol: ${JSON.stringify(symbolPnl)}
Recent 10 trade PnLs (oldest→newest): ${sortedTrades.slice(-10).map(t => t.pnl.toFixed(0)).join(', ')}`;
}
