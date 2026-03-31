import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { analyzeTradesWithAI } from '@/lib/ai';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: trades }, { data: rules }] = await Promise.all([
    supabase.from('trades').select('*').eq('user_id', user.id).order('date', { ascending: true }),
    supabase.from('rules').select('*').eq('user_id', user.id).single(),
  ]);

  const analysis = await analyzeTradesWithAI(trades || [], rules || undefined);
  return NextResponse.json(analysis);
}
