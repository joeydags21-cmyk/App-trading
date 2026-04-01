export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * POST /api/onboarding
 * Accepts a single trade + trading style context, saves the trade,
 * and returns a lightweight coach insight (strength/weakness/suggestion).
 * Works with just 1 trade — designed for onboarding only.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured.' }, { status: 500 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { trade, style, goal } = body;

  // Validate trade fields
  if (!trade?.date || !trade?.symbol || trade?.pnl == null) {
    return NextResponse.json({ error: 'Trade is missing required fields.' }, { status: 400 });
  }

  // Save the trade
  const tradeRow: Record<string, any> = {
    user_id: user.id,
    date: trade.date,
    symbol: trade.symbol.trim().toUpperCase(),
    direction: trade.direction === 'short' ? 'short' : 'long',
    pnl: parseFloat(trade.pnl),
    notes: trade.notes?.trim() || null,
    entry_price: trade.entry_price != null && trade.entry_price !== '' ? parseFloat(trade.entry_price) : null,
    exit_price: trade.exit_price != null && trade.exit_price !== '' ? parseFloat(trade.exit_price) : null,
  };

  let { data: saved, error: saveError } = await supabase.from('trades').insert([tradeRow]).select();

  // Retry without optional columns if schema doesn't have them yet
  if (saveError && (saveError.message?.includes('entry_price') || saveError.message?.includes('exit_price'))) {
    const { entry_price, exit_price, ...coreRow } = tradeRow;
    const retry = await supabase.from('trades').insert([coreRow]).select();
    saved = retry.data;
    saveError = retry.error;
  }

  if (saveError || !saved?.length) {
    console.error('[POST /api/onboarding] Save failed:', saveError);
    return NextResponse.json({ error: 'Unable to save trade. Please try again.' }, { status: 500 });
  }

  // Build compact context for AI
  const pnl = parseFloat(trade.pnl);
  const won = pnl > 0;
  const styleLabel = style || 'futures trader';
  const goalLabel = goal || 'improve consistency';

  const prompt = `You are a concise trading coach. A new trader just logged their very first trade in our app. Give them immediate, specific feedback.

TRADER CONTEXT:
- Trading style: ${styleLabel}
- Main goal: ${goalLabel}
- First trade: ${trade.symbol} ${trade.direction}, P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}, ${won ? 'WIN' : 'LOSS'}
${trade.notes ? `- Their note: "${trade.notes}"` : ''}

RULES:
1. Speak directly to them. Use "you" and "your".
2. Be encouraging but honest. This is their first trade in the app.
3. Reference their specific numbers (symbol, P&L, direction).
4. Keep each field to ONE sentence.
5. For "suggestion": give one concrete thing they can do on their NEXT trade. Start with an action verb.
6. Never say "based on your data" or "it appears" or "ensure that".

Return ONLY valid JSON — no markdown fences:
{
  "strength": "One genuine strength or positive observation about this trade.",
  "weakness": "One honest weakness or risk to watch for.",
  "suggestion": "One action verb + one concrete thing for their next trade."
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response');

    const cleaned = content.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    const insight = JSON.parse(cleaned);

    return NextResponse.json({
      trade: saved[0],
      insight: { ...insight, empty: false },
    });
  } catch (err: any) {
    console.error('[POST /api/onboarding] AI failed:', err);
    // Return saved trade even if AI fails — don't block onboarding
    return NextResponse.json({
      trade: saved[0],
      insight: {
        empty: true,
        strength: null,
        weakness: null,
        suggestion: null,
      },
    });
  }
}
