import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use the service-role client here — webhooks run outside user auth context
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function upsertProfile(userId: string, fields: Record<string, any>) {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...fields }, { onConflict: 'id' });
  if (error) console.error('[webhook] upsertProfile error:', error);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
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
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      if (!userId) break;

      await upsertProfile(userId, {
        stripe_customer_id: session.customer as string,
        subscription_status: 'active',
      });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) break;

      const status = sub.status; // 'active' | 'trialing' | 'past_due' | 'canceled' | etc.
      await upsertProfile(userId, {
        stripe_subscription_id: sub.id,
        subscription_status: status === 'trialing' ? 'trialing' : status === 'active' ? 'active' : 'inactive',
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) break;

      await upsertProfile(userId, { subscription_status: 'inactive' });
      break;
    }

    default:
      // Ignore all other events
      break;
  }

  return NextResponse.json({ received: true });
}
