export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isSubscribed } from '@/lib/subscription';

export async function GET() {
  // Check subscription
  const subscribed = await isSubscribed();
  if (!subscribed) {
    return NextResponse.json({ error: 'subscription_required' }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[GET /api/coach] ANTHROPIC_API_KEY is not set');
    return NextResponse.json(
      { error: 'AI coaching is not configured. Add your ANTHROPIC_API_KEY to environment variables.' },
      { status: 500 }
    );
  }

  const client = new Anthropic();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: tradesData, error: tradesError } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (tradesError) {
    console.error('[GET /api/coach] Failed to fetch trades:', tradesError);
    return NextResponse.json({ error: 'Failed to load trades.' }, { status: 500 });
  }

  const trades = Array.isArray(tradesData) ? tradesData : [];

  if (trades.length < 3) {
    return NextResponse.json({
      empty: true,
      message: 'Add at least 3 trades to unlock your trading coach.',
    });
  }

  // Use most recent 20 trades for coaching context
  const recent = trades.slice(0, 20);

  // ── Compute stats the AI will reference ──────────────────────────────────────

  const wins = recent.filter((t) => t.pnl > 0);
  const losses = recent.filter((t) => t.pnl < 0);
  const winRate = (wins.length / recent.length) * 100;
  const totalPnl = recent.reduce((s, t) => s + t.pnl, 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const rrRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : null;

  // Win rate split by direction
  const longs = recent.filter((t) => t.direction === 'long');
  const shorts = recent.filter((t) => t.direction === 'short');
  const longWinRate = longs.length > 0
    ? ((longs.filter((t) => t.pnl > 0).length / longs.length) * 100).toFixed(0)
    : null;
  const shortWinRate = shorts.length > 0
    ? ((shorts.filter((t) => t.pnl > 0).length / shorts.length) * 100).toFixed(0)
    : null;

  // Current streak (most recent trades first)
  const sorted = [...recent].reverse(); // oldest → newest
  const lastIsWin = sorted[sorted.length - 1].pnl > 0;
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const sameType = lastIsWin ? sorted[i].pnl > 0 : sorted[i].pnl < 0;
    if (sameType) streak++;
    else break;
  }
  const streakLabel = streak >= 2
    ? `${streak}-trade ${lastIsWin ? 'winning' : 'losing'} streak`
    : null;

  // Biggest single loss
  const biggestLoss = losses.length > 0
    ? Math.abs(Math.min(...losses.map((t) => t.pnl)))
    : null;

  // Biggest single win
  const biggestWin = wins.length > 0
    ? Math.max(...wins.map((t) => t.pnl))
    : null;

  // Trades per day
  const byDate: Record<string, number> = {};
  recent.forEach((t) => { byDate[t.date] = (byDate[t.date] || 0) + 1; });
  const dateValues = Object.values(byDate);
  const avgPerDay = dateValues.length > 0
    ? (dateValues.reduce((s, c) => s + c, 0) / dateValues.length).toFixed(1)
    : null;

  // Recent 5 P&Ls to show momentum
  const last5 = recent.slice(0, 5).reverse().map((t) =>
    `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(0)}`
  ).join(', ');

  // Notes (non-empty, last 5)
  const notesLines = recent
    .filter((t) => t.notes && t.notes.trim())
    .slice(0, 5)
    .map((t) => `- ${t.notes?.trim()}`);

  // ── Build the prompt ──────────────────────────────────────────────────────────

  const statsBlock = [
    `Trades analysed: ${recent.length} (most recent)`,
    `Win rate: ${winRate.toFixed(0)}% (${wins.length} wins, ${losses.length} losses)`,
    `Total P&L: $${totalPnl.toFixed(2)}`,
    `Avg win: $${avgWin.toFixed(2)} | Avg loss: $${avgLoss.toFixed(2)}`,
    rrRatio ? `Risk/reward ratio: ${rrRatio} (win/loss dollar size)` : null,
    longWinRate && longs.length >= 2 ? `Long trades: ${longs.length} trades, ${longWinRate}% win rate` : null,
    shortWinRate && shorts.length >= 2 ? `Short trades: ${shorts.length} trades, ${shortWinRate}% win rate` : null,
    streakLabel ? `Current streak: ${streakLabel}` : null,
    biggestWin ? `Biggest single win: $${biggestWin.toFixed(2)}` : null,
    biggestLoss ? `Biggest single loss: $${biggestLoss.toFixed(2)}` : null,
    avgPerDay ? `Avg trades per day: ${avgPerDay}` : null,
    `Last 5 trade P&Ls: ${last5}`,
    notesLines.length > 0 ? `Trader notes from recent trades:\n${notesLines.join('\n')}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are an elite trading coach — the kind traders pay $500/hour to work with. You have real numbers in front of you. Give it to them straight. No softening. No encouragement for the sake of it.

TRADER'S STATS:
${statsBlock}

ABSOLUTE RULES:
1. Use "you" and "your". Never "the trader", "one might", "it appears", or "based on your data".
2. Every sentence must cite a specific number from the stats. No number = rewrite the sentence.
3. Be honest and direct. A $50/month coaching tool must be worth more than a pat on the back.
4. Maximum 1-2 sentences per field. Every word must earn its place.
5. "mistake" MUST start with: "Your biggest mistake is" — then name it plainly with the number.
6. "fix" MUST start with: "Fix this immediately:" — then one specific behavioral change.
7. "nextTrade" MUST start with: "On your next trade:" — one concrete, pre-trade action.
8. Never promise profits. Never say "ensure that" or "it's important to".

Return ONLY valid JSON — no markdown, no text outside the braces:
{
  "strength": "Your [specific strength] is [specific number/fact]. 1 sentence, cite the number.",
  "mistake": "Your biggest mistake is [name the exact problem] — [the number that proves it]. 1-2 sentences.",
  "fix": "Fix this immediately: [one specific behavioral change tied to the mistake]. 1 sentence.",
  "nextTrade": "On your next trade: [one concrete pre-trade rule or limit they must follow]. 1 sentence."
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from AI');

    const cleaned = content.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    const result = JSON.parse(cleaned);

    console.log('[GET /api/coach] Coaching insight generated for user', user.id);
    // Normalise: support both old (weakness/suggestion) and new (mistake/fix/nextTrade) field names
    const normalised = {
      strength: result.strength,
      mistake: result.mistake ?? result.weakness,
      fix: result.fix,
      nextTrade: result.nextTrade ?? result.suggestion,
      empty: false,
    };
    return NextResponse.json(normalised);
  } catch (err: any) {
    console.error('[GET /api/coach] AI call failed:', err);
    const message = err?.message?.includes('JSON')
      ? 'Unable to generate coaching insights right now. Try again.'
      : err?.message || 'Unable to generate coaching insights right now. Try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
