export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/subscription
 * Returns {isPro: boolean} for the current user.
 * Called on page load to gate premium features immediately.
 * Always returns a safe value — never throws.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Not logged in → definitely not pro
    if (!user) return NextResponse.json({ isPro: false });

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_pro, subscription_status')
      .eq('id', user.id)
      .single();

    // No row or query error → treat as not subscribed (safe default)
    if (error || !profile) {
      console.warn('[GET /api/subscription] No profile row for user', user.id, '— defaulting to isPro: false');
      return NextResponse.json({ isPro: false });
    }

    const isPro =
      profile.is_pro === true ||
      profile.subscription_status === 'active' ||
      profile.subscription_status === 'trialing';

    // Debug: always log subscription state so paywall issues are visible in server logs
    console.log('[GET /api/subscription] USER STATUS:', {
      userId: user.id,
      is_pro: profile.is_pro,
      subscription_status: profile.subscription_status,
      isPro,
    });

    return NextResponse.json({ isPro });
  } catch (err) {
    // Any unexpected error → fail closed (not pro)
    console.error('[GET /api/subscription] Unexpected error:', err);
    return NextResponse.json({ isPro: false });
  }
}
