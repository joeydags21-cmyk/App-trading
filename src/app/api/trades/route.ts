import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const rows = Array.isArray(body) ? body : [body];

  const inserts = rows.map((t) => ({
    user_id: user.id,
    date: t.date,
    symbol: (t.symbol || t.ticker || '').toString().trim().toUpperCase(),
    direction: t.direction === 'short' ? 'short' : 'long',
    entry_price: t.entry_price != null && t.entry_price !== '' ? parseFloat(t.entry_price) : null,
    exit_price: t.exit_price != null && t.exit_price !== '' ? parseFloat(t.exit_price) : null,
    pnl: typeof t.pnl === 'number' ? t.pnl : parseFloat(t.pnl) || 0,
    notes: t.notes?.toString().trim() || null,
  }));

  console.log('[POST /api/trades] Inserting', inserts.length, 'trade(s) for user', user.id);

  const { data, error } = await supabase
    .from('trades')
    .insert(inserts)
    .select();

  if (error) {
    console.error('[POST /api/trades] Supabase insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    console.error('[POST /api/trades] Insert returned no rows');
    return NextResponse.json({ error: 'Insert returned no data — check RLS policies' }, { status: 500 });
  }

  console.log('[POST /api/trades] Inserted successfully:', data.length, 'row(s)');
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
