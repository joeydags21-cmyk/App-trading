import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/subscription
 * Returns the current user's subscription state.
 * Called on page load to gate premium features immediately.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isPro: false });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, subscription_status')
    .eq('id', user.id)
    .single();

  // Accept either the simple boolean OR the status string
  const isPro =
    profile?.is_pro === true ||
    profile?.subscription_status === 'active' ||
    profile?.subscription_status === 'trialing';

  return NextResponse.json({ isPro });
}
