import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: tradesData } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  const trades = Array.isArray(tradesData) ? tradesData : [];

  if (trades.length === 0) {
    return NextResponse.json({
      empty: true,
      message:
        "You don't have any trades logged yet. Add a few trades and I'll give you personalised coaching feedback.",
    });
  }

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const avgWin =
    wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)
      : 0;
  const winRate =
    trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  // Last 5 outcomes as W/L string
  const last5 = trades
    .slice(0, 5)
    .map((t) => (t.pnl > 0 ? 'W' : 'L'))
    .join(', ');

  const prompt = `You are a supportive but honest trading coach for futures traders. Based on the stats below, give brief personalised coaching feedback.

TRADER STATS:
- Total trades: ${trades.length}
- Win rate: ${winRate.toFixed(1)}%
- Total P&L: $${totalPnl.toFixed(2)}
- Avg win: $${avgWin.toFixed(2)}
- Avg loss: $${avgLoss.toFixed(2)}
- Last 5 trades (W=win, L=loss): ${last5}

Return ONLY valid JSON with no markdown or explanation:
{
  "strength": "One genuine strength — 1-2 sentences, specific to their numbers, written like a real coach talking to a student.",
  "weakness": "One key weakness — 1-2 sentences, honest and constructive, focused on the single most important thing to fix.",
  "suggestion": "One clear action to take on the next trade — start with an action verb, max 2 sentences."
}

Rules:
- Plain, direct language. Not a report — a conversation.
- No jargon, no filler phrases like "it's important to" or "ensure that".
- Never promise profits or predict future outcomes.
- Keep each field to 1-2 sentences.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const result = JSON.parse(content.text);
  return NextResponse.json({ ...result, empty: false });
}
