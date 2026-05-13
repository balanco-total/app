-- BalançoTotal — Financial Accounts migration
-- Run in Supabase SQL Editor AFTER schema.sql

-- ===================== TABLE =====================

CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid           NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name        varchar(60)    NOT NULL CHECK (char_length(name) >= 1),
  description text,
  balance     numeric(12, 2) NOT NULL DEFAULT 0,
  is_default  boolean        NOT NULL DEFAULT false,
  created_at  timestamptz    NOT NULL DEFAULT now()
);

-- Prevents two financial accounts with the same name within an org (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS financial_accounts_account_name_unique
  ON public.financial_accounts (account_id, lower(name));

-- ===================== EXPENSES =====================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS financial_account_id uuid
    REFERENCES public.financial_accounts(id) ON DELETE SET NULL;

-- ===================== RLS =====================

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_accounts_all_own_account" ON public.financial_accounts
  FOR ALL
  USING (account_id = public.get_my_account_id())
  WITH CHECK (account_id = public.get_my_account_id());
