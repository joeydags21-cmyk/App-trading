import Stripe from 'stripe';

// Lazily initialised so the module can be imported at build time without env vars.
// Throws at call time (request time) if the env var is missing.
function getStripeInstance(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-03-25.dahlia',
  });
}

let _stripe: Stripe | null = null;

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_stripe) _stripe = getStripeInstance();
    return (_stripe as any)[prop];
  },
});
