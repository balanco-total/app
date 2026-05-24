-- BalançoTotal — Recurring expenses
-- Creates the recurring_expenses template table and extends expenses
-- with columns to track materialized occurrences.

-- ===================== TABLE =====================

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id                   uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           uuid           NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id              uuid           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description          varchar(60)    NOT NULL CHECK (char_length(description) >= 1),
  amount               numeric(12,2)  NOT NULL CHECK (amount > 0),
  category_id          uuid           REFERENCES public.categories(id) ON DELETE SET NULL,
  financial_account_id uuid           REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  day_of_month         smallint       NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  start_year_month     text           NOT NULL CHECK (start_year_month ~ '^\d{4}-\d{2}$'),
  end_year_month       text           CHECK (end_year_month ~ '^\d{4}-\d{2}$'),
  created_at           timestamptz    NOT NULL DEFAULT now()
);

-- ===================== EXTEND expenses =====================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS recurring_expense_id uuid
    REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurrence_year_month text
    CHECK (occurrence_year_month ~ '^\d{4}-\d{2}$'),
  ADD COLUMN IF NOT EXISTS skipped boolean NOT NULL DEFAULT false;

-- Prevent materializing the same month twice for the same template
CREATE UNIQUE INDEX IF NOT EXISTS expenses_recurring_occurrence_unique
  ON public.expenses (recurring_expense_id, occurrence_year_month)
  WHERE recurring_expense_id IS NOT NULL AND occurrence_year_month IS NOT NULL;

-- ===================== INDEXES =====================

CREATE INDEX IF NOT EXISTS recurring_expenses_account_idx
  ON public.recurring_expenses (account_id);

-- ===================== RLS =====================

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_expenses_select_own_account" ON public.recurring_expenses
  FOR SELECT USING (account_id = public.get_my_account_id());

CREATE POLICY "recurring_expenses_insert_own" ON public.recurring_expenses
  FOR INSERT WITH CHECK (
    account_id = public.get_my_account_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "recurring_expenses_update_own" ON public.recurring_expenses
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "recurring_expenses_delete_own" ON public.recurring_expenses
  FOR DELETE USING (user_id = auth.uid());
