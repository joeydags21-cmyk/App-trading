import { createClient } from '@/lib/supabase/server';

/**
 * Server-side subscription check.
 * Returns true if the user has is_pro=true OR an active/trialing status.
 * Used by API routes to gate premium features.
 */
export async function isSubscribed(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, subscription_status')
      .eq('id', user.id)
      .single();

    return (
      profile?.is_pro === true ||
      profile?.subscription_status === 'active' ||
      profile?.subscription_status === 'trialing'
    );
  } catch {
    return false;
  }
}
