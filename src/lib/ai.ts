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

  const { statsBlock, winRate, winProb } = buildTradeSummary(safeTrades, rules);

  const prompt = `You are a trading performance coach reviewing a futures trader's full trade history. You have their real numbers. Give direct, specific feedback that references actual figures from their data.

TRADER DATA:
${statsBlock}

INSTRUCTIONS:
- Speak directly: "You", not "the trader" or "one might notice"
- Every insight must cite a specific number from the data
- Never use phrases like "based on your data", "it appears", "it is important to", or "ensure that"
- Be honest and direct. If something is costing them money, name it plainly
- Insights should read like a coach talking, not a financial report
- Do NOT repeat the same point in multiple insights

Return ONLY valid JSON — no markdown fences, no text outside the JSON:
{
  "insights": [
    {
      "type": "warning|info|critical",
      "title": "Short title (5 words max)",
      "description": "Direct, specific observation using exact numbers. 1-2 sentences. Start with 'You' or the specific number."
    }
  ],
  "nextTradePrediction": {
    "winProbability": ${winProb},
    "warnings": ["One-sentence warning if there is a genuine risk flag, otherwise empty array"],
    "summary": "2 sentences max. Reference their recent trend specifically. Start with a number or 'You'."
  },
  "rulesAnalysis": {
    "violations": ["If rules were set and broken, name the violation with the number. Otherwise empty array."],
    "correlations": ["If rule-breaking correlates with losses, state it directly with numbers. Otherwise empty array."]
  }
}

Generate exactly 5 insights. Cover these areas — pick whichever 5 are most supported by the data:
1. Win rate context (is it strong, weak, or misleading given P&L?)
2. Risk/reward (are wins bigger or smaller than losses?)
3. Consecutive loss behavior (revenge trading pattern?)
4. Volume patterns (overtrading on bad days?)
5. Direction bias (longs vs shorts — which performs better?)
6. Symbol concentration (if one symbol is dragging down results)
7. Recent momentum (last 5 trades tell a story)`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from AI');

  const cleaned = content.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');

  let analysis: AIAnalysis;
  try {
    analysis = JSON.parse(cleaned);
  } catch {
    console.error('[analyzeTradesWithAI] Failed to parse AI response:', content.text);
    throw new Error('AI returned an unexpected format. Please try again.');
  }

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
  const symbols = Array.from(new Set(safeTodayTrades.map(t => t.symbol))).join(', ');

  const notesLines = safeTodayTrades
    .filter(t => t.notes?.trim())
    .map(t => `- ${t.notes?.trim()}`);

  const prompt = `You are a trading coach debriefing a futures trader at the end of their day. You have their numbers. Be direct, specific, and honest.

TODAY:
- Trades: ${safeTodayTrades.length}
- P&L: $${todayPnl.toFixed(2)} (${todayWins} wins, ${safeTodayTrades.length - todayWins} losses)
- Symbols: ${symbols || 'n/a'}
- Historical avg trade P&L: $${historicalAvgPnl.toFixed(2)}
${notesLines.length > 0 ? `- Their notes:\n${notesLines.join('\n')}` : ''}

Write a short debrief:
1. One sentence: today's performance vs their normal
2. Three things to fix — be specific to today's numbers, not generic advice
3. Three things done well — find something real, not patronising

Rules:
- Speak directly: "You" not "the trader"
- Reference actual numbers (e.g. "$320 loss", "3 of your 5 trades")
- No filler. No "it's important to". No promises.
- Use headers: "Fix:", "Keep:"`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return content.text;
}

// ── Internal helper ───────────────────────────────────────────────────────────

function buildTradeSummary(trades: Trade[], rules?: {
  max_trades_per_day?: number | null;
  max_loss_per_day?: number | null;
  max_position_size?: number | null;
}): { statsBlock: string; winRate: number; winProb: number } {
  const safeTrades = Array.isArray(trades) ? trades : [];

  const wins = safeTrades.filter((t) => t.pnl > 0);
  const losses = safeTrades.filter((t) => t.pnl < 0);
  const totalPnl = safeTrades.reduce((s, t) => s + t.pnl, 0);
  const winRate = safeTrades.length > 0 ? (wins.length / safeTrades.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const rrRatio = avgLoss > 0 ? avgWin / avgLoss : null;

  // Direction split
  const longs = safeTrades.filter(t => t.direction === 'long');
  const shorts = safeTrades.filter(t => t.direction === 'short');
  const longWR = longs.length > 0 ? ((longs.filter(t => t.pnl > 0).length / longs.length) * 100).toFixed(0) : null;
  const shortWR = shorts.length > 0 ? ((shorts.filter(t => t.pnl > 0).length / shorts.length) * 100).toFixed(0) : null;

  // Consecutive loss analysis
  const sortedTrades = [...safeTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let maxConsecLosses = 0;
  let cur = 0;
  sortedTrades.forEach((t) => {
    if (t.pnl < 0) { cur++; maxConsecLosses = Math.max(maxConsecLosses, cur); }
    else cur = 0;
  });

  // Current streak
  const lastIsWin = sortedTrades.length > 0 && sortedTrades[sortedTrades.length - 1].pnl > 0;
  let streak = 0;
  for (let i = sortedTrades.length - 1; i >= 0; i--) {
    if (lastIsWin ? sortedTrades[i].pnl > 0 : sortedTrades[i].pnl < 0) streak++;
    else break;
  }

  // Trades per day
  const byDate: Record<string, { count: number; pnl: number }> = {};
  safeTrades.forEach((t) => {
    if (!byDate[t.date]) byDate[t.date] = { count: 0, pnl: 0 };
    byDate[t.date].count++;
    byDate[t.date].pnl += t.pnl;
  });
  const dateValues = Object.values(byDate);
  const avgTradesPerDay = dateValues.length > 0
    ? dateValues.reduce((s, d) => s + d.count, 0) / dateValues.length
    : 0;
  const maxTradesInDay = dateValues.length > 0 ? Math.max(...dateValues.map(d => d.count)) : 0;

  // Losing days where they traded above average
  const lossDays = dateValues.filter(d => d.pnl < 0);
  const overtradedLossDays = lossDays.filter(d => d.count > avgTradesPerDay * 1.3).length;

  // Symbol P&L breakdown
  const symbolPnl: Record<string, { pnl: number; count: number }> = {};
  safeTrades.forEach((t) => {
    if (!symbolPnl[t.symbol]) symbolPnl[t.symbol] = { pnl: 0, count: 0 };
    symbolPnl[t.symbol].pnl += t.pnl;
    symbolPnl[t.symbol].count++;
  });
  const symbolSummary = Object.entries(symbolPnl)
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .map(([sym, v]) => `${sym}: ${v.count} trades, $${v.pnl.toFixed(0)} P&L`)
    .join(' | ');

  // Recent 10 P&Ls
  const last10 = sortedTrades.slice(-10).map(t => `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(0)}`).join(', ');

  // Rules violations data
  let rulesSection = '';
  if (rules) {
    const violations: string[] = [];
    if (rules.max_trades_per_day && maxTradesInDay > rules.max_trades_per_day) {
      violations.push(`Exceeded max ${rules.max_trades_per_day} trades/day — hit ${maxTradesInDay} on worst day`);
    }
    if (rules.max_loss_per_day) {
      const worstDay = dateValues.reduce((a, b) => a.pnl < b.pnl ? a : b, { count: 0, pnl: 0 });
      if (Math.abs(worstDay.pnl) > rules.max_loss_per_day) {
        violations.push(`Exceeded max $${rules.max_loss_per_day} daily loss — worst day was $${Math.abs(worstDay.pnl).toFixed(0)}`);
      }
    }
    if (violations.length > 0) {
      rulesSection = `\nRules set by trader:\n${violations.map(v => `- ${v}`).join('\n')}`;
    }
  }

  // Win probability for next trade (based on recent 10)
  const recent10 = sortedTrades.slice(-10);
  const recent10WR = recent10.length > 0 ? (recent10.filter(t => t.pnl > 0).length / recent10.length) * 100 : winRate;
  const winProb = Math.round(recent10WR);

  const statsBlock = [
    `Total trades: ${safeTrades.length}`,
    `Win rate: ${winRate.toFixed(0)}% (${wins.length} wins, ${losses.length} losses)`,
    `Total P&L: $${totalPnl.toFixed(2)}`,
    `Avg win: $${avgWin.toFixed(2)} | Avg loss: $${avgLoss.toFixed(2)}`,
    rrRatio !== null ? `Risk/reward: ${rrRatio.toFixed(2)} (avg win ÷ avg loss)` : null,
    longWR && longs.length >= 2 ? `Longs: ${longs.length} trades, ${longWR}% win rate` : null,
    shortWR && shorts.length >= 2 ? `Shorts: ${shorts.length} trades, ${shortWR}% win rate` : null,
    `Max consecutive losses: ${maxConsecLosses}`,
    streak >= 2 ? `Current streak: ${streak} ${lastIsWin ? 'wins' : 'losses'} in a row` : null,
    `Avg trades per day: ${avgTradesPerDay.toFixed(1)} | Max in one day: ${maxTradesInDay}`,
    lossDays.length > 0 ? `Losing days with above-average trade count: ${overtradedLossDays} of ${lossDays.length}` : null,
    `Symbol breakdown: ${symbolSummary}`,
    `Recent 10 P&Ls (oldest→newest): ${last10}`,
    rulesSection || null,
  ].filter(Boolean).join('\n');

  return { statsBlock, winRate, winProb };
}
