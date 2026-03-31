import { createClient } from '@/lib/supabase/server';

/**
 * Returns true if the current user has an active or trialing subscription.
 * Returns false if unauthenticated, not found, or inactive.
 */
export async function isSubscribed(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  const status = profile?.subscription_status;
  return status === 'active' || status === 'trialing';
}
