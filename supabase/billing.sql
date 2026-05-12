-- BalançoTotal — Billing migration
-- Run this in the Supabase SQL Editor after schema.sql

-- ===================== COLUMNS =====================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS trial_ends_at     timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled')),
  ADD COLUMN IF NOT EXISTS abacatepay_subscription_id text;

-- Backfill trial_ends_at for existing accounts
UPDATE public.accounts SET trial_ends_at = created_at + interval '7 days' WHERE trial_ends_at IS NULL;

-- Now enforce NOT NULL with default for future rows
ALTER TABLE public.accounts
  ALTER COLUMN trial_ends_at SET NOT NULL,
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');

-- ===================== FUNCTION =====================

-- Returns true if the account's billing is valid (trial active OR subscription active)
CREATE OR REPLACE FUNCTION public.is_account_billing_active()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    subscription_status = 'active'
    OR (subscription_status = 'trialing' AND trial_ends_at > now())
  FROM public.accounts
  WHERE id = public.get_my_account_id();
$$;

-- ===================== RLS =====================

-- Allow service role to update billing fields (webhook handler uses service role key)
-- The existing accounts_select_own policy already covers SELECT.
-- No additional RLS needed: webhook uses admin client (bypasses RLS).
