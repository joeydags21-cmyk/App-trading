export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// ── SQL to create the user_goals table ───────────────────────────────────────
//
// Run this once in your Supabase SQL Editor:
//
// CREATE TABLE user_goals (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
//   monthly_goal numeric NOT NULL,
//   created_at timestamptz DEFAULT now() NOT NULL,
//   CONSTRAINT user_goals_user_id_unique UNIQUE (user_id)
// );
//
// ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
//
// CREATE POLICY "Users can manage their own goals"
//   ON user_goals FOR ALL
//   USING (auth.uid() = user_id)
//   WITH CHECK (auth.uid() = user_id);
//
// ─────────────────────────────────────────────────────────────────────────────

function isTableMissingError(error: any): boolean {
  const msg: string = (error?.message ?? error?.details ?? '').toLowerCase();
  const code: string = error?.code ?? '';
  return code === '42P01' || msg.includes('does not exist') || msg.includes('relation "user_goals"');
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_goals')
    .select('id, monthly_goal, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    if (isTableMissingError(error)) {
      // Table not created yet — signal the UI to show setup instructions
      return NextResponse.json({ monthly_goal: null, _table_missing: true });
    }
    console.error('[GET /api/goals] Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? { monthly_goal: null });
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

  const monthly_goal = parseFloat(body?.monthly_goal);
  if (isNaN(monthly_goal) || monthly_goal <= 0) {
    return NextResponse.json({ error: 'Goal must be a positive number.' }, { status: 400 });
  }
  if (monthly_goal > 10_000_000) {
    return NextResponse.json({ error: 'Goal value is unreasonably large.' }, { status: 400 });
  }

  // Upsert — one row per user (unique constraint on user_id)
  const { data, error } = await supabase
    .from('user_goals')
    .upsert(
      { user_id: user.id, monthly_goal },
      { onConflict: 'user_id' }
    )
    .select('id, monthly_goal, created_at')
    .single();

  if (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json({ error: 'table_missing' }, { status: 503 });
    }
    console.error('[POST /api/goals] Supabase error:', error);
    return NextResponse.json({ error: 'Unable to save goal. Please try again.' }, { status: 500 });
  }

  console.log('[POST /api/goals] Goal saved for user', user.id, '→ $', monthly_goal);
  return NextResponse.json(data);
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('user_goals')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json({ success: true }); // nothing to delete
    }
    console.error('[DELETE /api/goals] Supabase error:', error);
    return NextResponse.json({ error: 'Unable to remove goal.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
