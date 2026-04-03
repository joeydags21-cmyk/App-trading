export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('goal_settings')
      .select('id, goal_type, goal_amount, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[GET /api/goals]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? { goal_type: null, goal_amount: null });
  } catch (err: any) {
    console.error('[GET /api/goals] unhandled:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

    const goal_amount = parseFloat(body?.goal_amount);
    const goal_type = body?.goal_type;

    if (isNaN(goal_amount) || goal_amount <= 0) {
      return NextResponse.json({ error: 'Goal must be a positive number.' }, { status: 400 });
    }
    if (!['daily', 'weekly', 'monthly'].includes(goal_type)) {
      return NextResponse.json({ error: 'goal_type must be daily, weekly, or monthly.' }, { status: 400 });
    }
    if (goal_amount > 10_000_000) {
      return NextResponse.json({ error: 'Goal value is unreasonably large.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('goal_settings')
      .upsert({ user_id: user.id, goal_amount, goal_type }, { onConflict: 'user_id' })
      .select('id, goal_type, goal_amount, created_at')
      .single();

    if (error) {
      console.error('[POST /api/goals]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[POST /api/goals] unhandled:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase.from('goal_settings').delete().eq('user_id', user.id);
    if (error) {
      console.error('[DELETE /api/goals]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/goals] unhandled:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
