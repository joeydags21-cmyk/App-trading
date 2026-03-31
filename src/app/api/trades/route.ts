export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Columns we always send
const CORE_COLUMNS = ['user_id', 'date', 'symbol', 'direction', 'pnl', 'notes'] as const;
// Columns that may not exist in older schema versions
const OPTIONAL_COLUMNS = ['entry_price', 'exit_price'] as const;

function buildInsertRow(t: any, userId: string, includeOptional: boolean) {
  const row: Record<string, any> = {
    user_id: userId,
    date: (t.date ?? '').toString(),
    symbol: (t.symbol || t.ticker || '').toString().trim().toUpperCase() || 'UNKNOWN',
    direction: t.direction === 'short' ? 'short' : 'long',
    pnl: typeof t.pnl === 'number' ? t.pnl : parseFloat(t.pnl) || 0,
    notes: t.notes?.toString().trim() || null,
  };

  if (includeOptional) {
    row.entry_price = t.entry_price != null && t.entry_price !== '' ? parseFloat(t.entry_price) : null;
    row.exit_price = t.exit_price != null && t.exit_price !== '' ? parseFloat(t.exit_price) : null;
  }

  return row;
}

/** Returns true if the Supabase error is a "column does not exist" schema error */
function isMissingColumnError(error: any): boolean {
  const msg: string = error?.message ?? error?.details ?? '';
  return msg.includes('column') && (
    msg.includes('does not exist') ||
    msg.includes('unknown column') ||
    msg.includes('entry_price') ||
    msg.includes('exit_price')
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) {
    console.error('[GET /api/trades] Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const rows = Array.isArray(body) ? body : [body];

  // Validate required fields
  for (const t of rows) {
    if (!t.date) return NextResponse.json({ error: 'Date is required.' }, { status: 400 });
    if (!t.symbol && !t.ticker) return NextResponse.json({ error: 'Symbol is required.' }, { status: 400 });
    if (t.pnl == null || isNaN(parseFloat(t.pnl))) return NextResponse.json({ error: 'P&L must be a valid number.' }, { status: 400 });
  }

  // Attempt 1: insert with entry_price + exit_price
  const inserts = rows.map((t) => buildInsertRow(t, user.id, true));
  console.log('[POST /api/trades] Inserting', inserts.length, 'trade(s) for user', user.id);

  let { data, error } = await supabase.from('trades').insert(inserts).select();

  // Attempt 2: if the schema doesn't have optional columns yet, retry without them
  if (error && isMissingColumnError(error)) {
    console.warn('[POST /api/trades] Missing optional columns (entry_price/exit_price) — retrying without them:', error.message);
    const fallbackInserts = rows.map((t) => buildInsertRow(t, user.id, false));
    const fallback = await supabase.from('trades').insert(fallbackInserts).select();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('[POST /api/trades] Supabase insert error:', error);
    // Return a clean message to the client, not the raw Postgres error
    return NextResponse.json({ error: 'Unable to save trade. Please try again.' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    console.error('[POST /api/trades] Insert returned no rows — check RLS policies');
    return NextResponse.json({ error: 'Trade was not saved. Check your Supabase RLS policies allow inserts.' }, { status: 500 });
  }

  console.log('[POST /api/trades] Inserted successfully:', data.length, 'row(s)');
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let id: string;
  try {
    const body = await req.json();
    id = body.id;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!id) return NextResponse.json({ error: 'Trade ID is required.' }, { status: 400 });

  const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', user.id);
  if (error) {
    console.error('[DELETE /api/trades] Supabase error:', error);
    return NextResponse.json({ error: 'Unable to delete trade. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
