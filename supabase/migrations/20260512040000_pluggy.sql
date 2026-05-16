-- BalançoTotal — Pluggy Open Finance migration
-- Run in Supabase SQL Editor AFTER schema.sql, billing.sql, stripe_migration.sql

-- ===================== EXPENSES =====================

-- Deduplication key: one expense row per (account, Pluggy transaction)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS pluggy_transaction_id text;

-- Partial unique index — only enforced when pluggy_transaction_id is not null
-- so manually-created and CSV/OFX-imported rows (null) are unaffected
CREATE UNIQUE INDEX IF NOT EXISTS expenses_account_pluggy_txn_unique
  ON public.expenses (account_id, pluggy_transaction_id)
  WHERE pluggy_transaction_id IS NOT NULL;

-- ===================== TABLE =====================

CREATE TABLE IF NOT EXISTS public.bank_connections (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid        NOT NULL REFERENCES public.accounts(id)  ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  item_id        text        NOT NULL,
  connector_name text,
  connector_logo text,
  last_synced_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- One connection object per Open Finance item per account
CREATE UNIQUE INDEX IF NOT EXISTS bank_connections_account_item_unique
  ON public.bank_connections (account_id, item_id);

-- ===================== RLS =====================

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

-- Any account member can read connections
CREATE POLICY "bank_connections_select_own_account" ON public.bank_connections
  FOR SELECT USING (account_id = public.get_my_account_id());

-- Only owner can delete connections (sync route uses admin client for upserts — no INSERT policy needed)
CREATE POLICY "bank_connections_delete_owner" ON public.bank_connections
  FOR DELETE USING (
    account_id = public.get_my_account_id()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
  );
