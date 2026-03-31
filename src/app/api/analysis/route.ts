import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { analyzeTradesWithAI } from '@/lib/ai';
import { isSubscribed } from '@/lib/subscription';

export async function GET() {
  // Check subscription
  const subscribed = await isSubscribed();
  if (!subscribed) {
    return NextResponse.json({ error: 'subscription_required' }, { status: 403 });
  }

  // Check API key before doing anything
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[GET /api/analysis] ANTHROPIC_API_KEY is not set');
    return NextResponse.json(
      { error: 'AI analysis is not configured. Add your ANTHROPIC_API_KEY to environment variables.' },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [tradesResult, rulesResult] = await Promise.all([
    supabase.from('trades').select('*').eq('user_id', user.id).order('date', { ascending: true }),
    supabase.from('rules').select('*').eq('user_id', user.id).single(),
  ]);

  if (tradesResult.error) {
    console.error('[GET /api/analysis] Failed to fetch trades:', tradesResult.error);
    return NextResponse.json({ error: 'Failed to load trades from database.' }, { status: 500 });
  }

  const trades = Array.isArray(tradesResult.data) ? tradesResult.data : [];

  if (trades.length < 3) {
    return NextResponse.json(
      { error: 'not_enough_trades', message: 'Add at least 3 trades to unlock AI insights.' },
      { status: 200 }
    );
  }

  try {
    const analysis = await analyzeTradesWithAI(trades, rulesResult.data ?? undefined);
    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error('[GET /api/analysis] AI analysis failed:', err);
    const message = err?.message?.includes('API key')
      ? 'Invalid or missing Anthropic API key. Check your environment variables.'
      : err?.message || 'AI analysis failed. Please try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
