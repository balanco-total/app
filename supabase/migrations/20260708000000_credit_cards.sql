-- BalançoTotal — Credit cards migration
-- Run in Supabase SQL Editor AFTER 20260515000000_balance_trigger.sql
--
-- Adds credit cards, their monthly invoices (faturas) and links expenses to an
-- invoice. A credit-card expense (lançamento) never touches a bank balance: it
-- has financial_account_id NULL and paid_at NULL. The money only leaves a bank
-- account when the invoice itself is paid (see Trigger 2).

-- ===================== TABLES =====================

CREATE TABLE IF NOT EXISTS public.credit_cards (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid           NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  description  varchar(60)    NOT NULL CHECK (char_length(description) >= 1),
  credit_limit numeric(12, 2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  closing_day  int            NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day      int            NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  created_at   timestamptz    NOT NULL DEFAULT now()
);

-- Prevents two credit cards with the same description within an org (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS credit_cards_account_description_unique
  ON public.credit_cards (account_id, lower(description));

CREATE TABLE IF NOT EXISTS public.credit_card_invoices (
  id                   uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           uuid           NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  credit_card_id       uuid           NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  reference_month      text           NOT NULL CHECK (reference_month ~ '^\d{4}-\d{2}$'),
  closing_date         date           NOT NULL,
  due_date             date           NOT NULL,
  status               text           NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),
  total                numeric(12, 2) NOT NULL DEFAULT 0,
  paid_at              timestamptz,
  paid_from_account_id uuid           REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  created_at           timestamptz    NOT NULL DEFAULT now()
);

-- One invoice per month per card
CREATE UNIQUE INDEX IF NOT EXISTS credit_card_invoices_card_month_unique
  ON public.credit_card_invoices (credit_card_id, reference_month);

-- ===================== EXPENSES =====================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS credit_card_invoice_id uuid
    REFERENCES public.credit_card_invoices(id) ON DELETE SET NULL;

-- An expense belongs to a bank account OR a credit-card invoice, never both.
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_account_xor_card;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_account_xor_card
    CHECK (NOT (financial_account_id IS NOT NULL AND credit_card_invoice_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS expenses_credit_card_invoice_id_idx
  ON public.expenses (credit_card_invoice_id)
  WHERE credit_card_invoice_id IS NOT NULL;

-- ===================== TRIGGER 1: invoice total =====================
-- Keeps credit_card_invoices.total in sync with its expenses (lançamentos).
-- Mirrors sync_financial_account_balance: reverse OLD, apply NEW. Covers amount
-- changes AND moving a lançamento between invoices.

CREATE OR REPLACE FUNCTION public.sync_invoice_total()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.credit_card_invoice_id IS NOT NULL THEN
      UPDATE public.credit_card_invoices
        SET total = total + NEW.amount
        WHERE id = NEW.credit_card_invoice_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.credit_card_invoice_id IS NOT NULL THEN
      UPDATE public.credit_card_invoices
        SET total = total - OLD.amount
        WHERE id = OLD.credit_card_invoice_id;
    END IF;
    IF NEW.credit_card_invoice_id IS NOT NULL THEN
      UPDATE public.credit_card_invoices
        SET total = total + NEW.amount
        WHERE id = NEW.credit_card_invoice_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.credit_card_invoice_id IS NOT NULL THEN
      UPDATE public.credit_card_invoices
        SET total = total - OLD.amount
        WHERE id = OLD.credit_card_invoice_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_total ON public.expenses;
CREATE TRIGGER trg_sync_invoice_total
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_total();

-- ===================== TRIGGER 2: invoice payment → bank balance =====================
-- When an invoice is paid, debit the chosen bank account by the invoice total.
-- Mirrors the paid_at logic of sync_financial_account_balance.

CREATE OR REPLACE FUNCTION public.sync_invoice_payment_balance()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Was not paid, now paid
  IF OLD.paid_at IS NULL AND NEW.paid_at IS NOT NULL THEN
    IF NEW.paid_from_account_id IS NOT NULL THEN
      UPDATE public.financial_accounts
        SET balance = balance - NEW.total
        WHERE id = NEW.paid_from_account_id;
    END IF;

  -- Was paid, now not paid (undo payment)
  ELSIF OLD.paid_at IS NOT NULL AND NEW.paid_at IS NULL THEN
    IF OLD.paid_from_account_id IS NOT NULL THEN
      UPDATE public.financial_accounts
        SET balance = balance + OLD.total
        WHERE id = OLD.paid_from_account_id;
    END IF;

  -- Was paid, still paid (total and/or account may have changed)
  ELSIF OLD.paid_at IS NOT NULL AND NEW.paid_at IS NOT NULL THEN
    IF OLD.paid_from_account_id IS NOT NULL THEN
      UPDATE public.financial_accounts
        SET balance = balance + OLD.total
        WHERE id = OLD.paid_from_account_id;
    END IF;
    IF NEW.paid_from_account_id IS NOT NULL THEN
      UPDATE public.financial_accounts
        SET balance = balance - NEW.total
        WHERE id = NEW.paid_from_account_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_payment_balance ON public.credit_card_invoices;
CREATE TRIGGER trg_sync_invoice_payment_balance
  AFTER UPDATE ON public.credit_card_invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_balance();

-- ===================== RLS =====================

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_cards_all_own_account" ON public.credit_cards
  FOR ALL
  USING (account_id = public.get_my_account_id())
  WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "credit_card_invoices_all_own_account" ON public.credit_card_invoices
  FOR ALL
  USING (account_id = public.get_my_account_id())
  WITH CHECK (account_id = public.get_my_account_id());
