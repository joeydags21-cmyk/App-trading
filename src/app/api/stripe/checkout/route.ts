export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST() {
  // Validate STRIPE_PRICE_ID is present and is a real Stripe Price ID (not a raw number)
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    console.error('[POST /api/stripe/checkout] STRIPE_PRICE_ID is not set');
    return NextResponse.json(
      { error: 'Stripe is not configured. Contact support.' },
      { status: 500 }
    );
  }
  if (!priceId.startsWith('price_')) {
    console.error('[POST /api/stripe/checkout] STRIPE_PRICE_ID is invalid — must start with "price_", got:', priceId);
    return NextResponse.json(
      { error: 'Invalid Stripe price configuration. STRIPE_PRICE_ID must be a Stripe Price ID (e.g. price_xxx), not a number.' },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log('[POST /api/stripe/checkout] User:', user?.id ?? 'not authenticated');

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    console.error('[POST /api/stripe/checkout] NEXT_PUBLIC_APP_URL is not set');
    return NextResponse.json(
      { error: 'App URL is not configured. Add NEXT_PUBLIC_APP_URL to your environment variables.' },
      { status: 500 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,   // always a valid Stripe Price ID (price_xxx)
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 3,
        metadata: { user_id: user.id },
      },
      metadata: { user_id: user.id },
      customer_email: user.email,
      custom_text: {
        submit: { message: 'Subscribe to Futures Edge AI — 3 days free, then $19/month. Cancel anytime.' },
      },
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/dashboard?checkout=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[POST /api/stripe/checkout] Stripe error:', err);
    return NextResponse.json(
      { error: 'Unable to start checkout. Please try again.' },
      { status: 500 }
    );
  }
}
