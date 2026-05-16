-- BalançoTotal — Seed "Carteira" financial account
-- Run in Supabase SQL Editor AFTER financial_accounts_migration.sql

-- ===================== UPDATE TRIGGER =====================
-- Replaces handle_new_user to also create the default "Carteira"
-- financial account for every new self-registered (owner) account.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id uuid;
  pending_invite  public.invites%ROWTYPE;
BEGIN
  -- Check for a valid pending invite for this email (case-insensitive)
  SELECT * INTO pending_invite
  FROM public.invites
  WHERE lower(email) = lower(NEW.email)
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF pending_invite.id IS NOT NULL THEN
    -- Invited path: join the inviter's account as member (no new financial account)
    INSERT INTO public.profiles (id, account_id, name, role)
    VALUES (
      NEW.id,
      pending_invite.account_id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'member'
    );

    UPDATE public.invites SET used_at = now() WHERE id = pending_invite.id;
  ELSE
    -- Self-registration path: create a new account as owner
    INSERT INTO public.accounts (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'name', 'Minha Conta'))
    RETURNING id INTO new_account_id;

    INSERT INTO public.profiles (id, account_id, name, role)
    VALUES (
      NEW.id,
      new_account_id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'owner'
    );

    -- Create the default "Carteira" financial account for new owners
    INSERT INTO public.financial_accounts (account_id, name, is_default)
    VALUES (new_account_id, 'Carteira', true);
  END IF;

  RETURN NEW;
END;
$$;

-- ===================== SEED EXISTING ACCOUNTS =====================
-- One-time: create "Carteira" for accounts that have no financial_accounts yet.

INSERT INTO public.financial_accounts (account_id, name, is_default)
SELECT a.id, 'Carteira', true
FROM public.accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM public.financial_accounts fa WHERE fa.account_id = a.id
);
