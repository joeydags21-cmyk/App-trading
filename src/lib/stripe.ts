import Stripe from 'stripe';

// Returns null if env var is missing — routes must check before using.
// Do NOT throw here: a module-level throw cannot be caught by route try/catch blocks.
export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null;
