-- BalançoTotal — Stripe migration
-- Run this in the Supabase SQL Editor to migrate from AbacatePay to Stripe

ALTER TABLE public.accounts
  RENAME COLUMN abacatepay_subscription_id TO stripe_subscription_id;
