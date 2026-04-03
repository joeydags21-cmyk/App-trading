export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const ai = new Anthropic();

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ insight: null });
    }

    const [tradesRes, goalRes] = await Promise.all([
      supabase.from('trades').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
      supabase.from('goal_settings').select('goal_type, goal_amount').eq('user_id', user.id).maybeSingle(),
    ]);

    const trades = tradesRes.data ?? [];
    const goal = goalRes.data;

    if (trades.length < 3 || !goal?.goal_amount) {
      return NextResponse.json({ insight: null });
    }

    // Compute stats
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const winRate = trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(0) : '0';
    const avgWin = wins.length > 0 ? (wins.reduce((s, t) => s + t.pnl, 0) / wins.length).toFixed(0) : '0';
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length).toFixed(0) : '0';
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

    // Period P&L
    const now = new Date();
    const goalType = goal.goal_type as 'daily' | 'weekly' | 'monthly';
    let periodStart: string;
    if (goalType === 'daily') {
      periodStart = now.toISOString().slice(0, 10);
    } else if (goalType === 'weekly') {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      periodStart = d.toISOString().slice(0, 10);
    } else {
      periodStart = now.toISOString().slice(0, 7) + '-01';
    }
    const periodTrades = trades.filter(t => t.date >= periodStart);
    const periodPnl = periodTrades.reduce((s, t) => s + t.pnl, 0);
    const pct = goal.goal_amount > 0 ? ((periodPnl / goal.goal_amount) * 100).toFixed(0) : '0';

    // Detect overtrading after losses
    const recentLosses = trades.slice(0, 5).filter(t => t.pnl < 0).length;
    const consecutiveLosses = (() => {
      let c = 0;
      for (const t of trades) { if (t.pnl < 0) c++; else break; }
      return c;
    })();

    const prompt = `You are an elite trading coach. Give ONE specific, actionable insight based on these real numbers.

STATS:
- ${goalType} goal: $${goal.goal_amount} | Period P&L: $${periodPnl.toFixed(0)} (${pct}% complete)
- Win rate: ${winRate}% | Avg win: $${avgWin} | Avg loss: $${avgLoss}
- Recent trades (last 5): ${trades.slice(0, 5).map(t => `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(0)}`).join(', ')}
- Consecutive losses at start of recent trades: ${consecutiveLosses}
- Trades needed to hit goal at avg win: ${Number(avgWin) > 0 ? Math.ceil((goal.goal_amount - periodPnl) / Number(avgWin)) : 'N/A'}

RULES:
- Be specific — cite exact numbers
- 1-2 sentences maximum
- Start with "You" or a number
- No generic advice ("be disciplined", "stick to your plan")
- Name the exact pattern you see

Return ONLY the insight text. No JSON, no formatting.`;

    const message = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    const insight = content.type === 'text' ? content.text.trim() : null;

    return NextResponse.json({ insight });
  } catch (err: any) {
    console.error('[GET /api/goal-insight]', err);
    return NextResponse.json({ insight: null });
  }
}
