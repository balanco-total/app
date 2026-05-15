-- BalançoTotal — Balance trigger migration
-- Run in Supabase SQL Editor AFTER financial_accounts_migration.sql
--
-- Creates a trigger that keeps financial_accounts.balance in sync whenever
-- expenses are inserted, updated, or deleted.
--
-- Rules:
--   INSERT  paid_at IS NOT NULL → subtract amount from account
--   UPDATE  NULL → NOT NULL      → subtract new amount from new account
--   UPDATE  NOT NULL → NULL      → add old amount back to old account
--   UPDATE  NOT NULL → NOT NULL  → add old amount to old account, subtract new amount from new account
--   DELETE  paid_at IS NOT NULL  → add old amount back to old account

CREATE OR REPLACE FUNCTION public.sync_financial_account_balance()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.paid_at IS NOT NULL AND NEW.financial_account_id IS NOT NULL THEN
      UPDATE public.financial_accounts
        SET balance = balance - NEW.amount
        WHERE id = NEW.financial_account_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Was not paid, now paid
    IF OLD.paid_at IS NULL AND NEW.paid_at IS NOT NULL THEN
      IF NEW.financial_account_id IS NOT NULL THEN
        UPDATE public.financial_accounts
          SET balance = balance - NEW.amount
          WHERE id = NEW.financial_account_id;
      END IF;

    -- Was paid, now not paid (undo payment)
    ELSIF OLD.paid_at IS NOT NULL AND NEW.paid_at IS NULL THEN
      IF OLD.financial_account_id IS NOT NULL THEN
        UPDATE public.financial_accounts
          SET balance = balance + OLD.amount
          WHERE id = OLD.financial_account_id;
      END IF;

    -- Was paid, still paid (amount and/or account may have changed)
    ELSIF OLD.paid_at IS NOT NULL AND NEW.paid_at IS NOT NULL THEN
      IF OLD.financial_account_id IS NOT NULL THEN
        UPDATE public.financial_accounts
          SET balance = balance + OLD.amount
          WHERE id = OLD.financial_account_id;
      END IF;
      IF NEW.financial_account_id IS NOT NULL THEN
        UPDATE public.financial_accounts
          SET balance = balance - NEW.amount
          WHERE id = NEW.financial_account_id;
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.paid_at IS NOT NULL AND OLD.financial_account_id IS NOT NULL THEN
      UPDATE public.financial_accounts
        SET balance = balance + OLD.amount
        WHERE id = OLD.financial_account_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_balance ON public.expenses;
CREATE TRIGGER trg_sync_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.sync_financial_account_balance();
