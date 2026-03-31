export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateDailyReport } from '@/lib/ai';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];
  const { data: trades } = await supabase.from('trades').select('*').eq('user_id', user.id).order('date', { ascending: true });
  const todayTrades = (trades || []).filter((t: any) => t.date === today);

  const report = await generateDailyReport(trades || [], todayTrades);
  return NextResponse.json({ report });
}
