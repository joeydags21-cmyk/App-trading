export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /auth/callback
 * Supabase redirects here after email verification.
 * Exchanges the one-time code for a session, then sends the user to /dashboard.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${appUrl}${next}`);
    }

    console.error('[GET /auth/callback] exchangeCodeForSession error:', error.message);
  }

  // If code is missing or exchange failed, send to login with an error hint
  return NextResponse.redirect(`${appUrl}/login?error=verification_failed`);
}
