import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.STRIPE_PRICE_ID) {
    console.error('[POST /api/stripe/checkout] STRIPE_PRICE_ID is not set');
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 3,
        metadata: {
          user_id: user.id,
        },
      },
      metadata: {
        user_id: user.id,
      },
      customer_email: user.email,
      success_url: `${baseUrl}/dashboard?upgraded=true`,
      cancel_url: `${baseUrl}/upgrade?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[POST /api/stripe/checkout] Stripe error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create checkout session.' }, { status: 500 });
  }
}
