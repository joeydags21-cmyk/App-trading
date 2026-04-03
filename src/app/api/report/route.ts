export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateDailyReport } from '@/lib/ai';

export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[GET /api/report] ANTHROPIC_API_KEY is not set');
      return NextResponse.json({ error: 'AI reporting is not configured.' }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date().toISOString().split('T')[0];

    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (tradesError) {
      console.error('[GET /api/report] Failed to fetch trades:', tradesError);
      return NextResponse.json({ error: 'Failed to load trades.' }, { status: 500 });
    }

    const allTrades = trades ?? [];
    const todayTrades = allTrades.filter((t: any) => t.date === today);

    const report = await generateDailyReport(allTrades, todayTrades);
    return NextResponse.json({ report });
  } catch (err: any) {
    console.error('[GET /api/report] Unhandled error:', err);
    return NextResponse.json({ error: 'Unable to generate report. Please try again.' }, { status: 500 });
  }
}
