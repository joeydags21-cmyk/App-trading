import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Service-role client bypasses RLS — required for webhook writes
function getServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role credentials are not configured.');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function setUserPro(userId: string, isPro: boolean, extraFields: Record<string, any> = {}) {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, is_pro: isPro, ...extraFields },
      { onConflict: 'id' }
    );
  if (error) {
    console.error('[webhook] setUserPro error for user', userId, ':', error);
  } else {
    console.log('[webhook] Set is_pro =', isPro, 'for user', userId);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] Missing stripe-signature or STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[webhook] Received event:', event.type);

  switch (event.type) {
    // Fires when checkout completes — grant access immediately
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      if (!userId) { console.warn('[webhook] checkout.session.completed missing user_id'); break; }

      await setUserPro(userId, true, {
        stripe_customer_id: session.customer as string,
        subscription_status: 'active',
      });
      break;
    }

    // Fires when subscription changes state (trialing, active, past_due, canceled, etc.)
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) { console.warn('[webhook]', event.type, 'missing user_id'); break; }

      const isPro = sub.status === 'active' || sub.status === 'trialing';
      const status = sub.status === 'trialing' ? 'trialing'
        : sub.status === 'active' ? 'active'
        : 'inactive';

      await setUserPro(userId, isPro, {
        stripe_subscription_id: sub.id,
        subscription_status: status,
      });
      break;
    }

    // Fires when subscription is cancelled or expires
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) { console.warn('[webhook] customer.subscription.deleted missing user_id'); break; }

      await setUserPro(userId, false, { subscription_status: 'inactive' });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
