-- Invite system migration
-- Run in Supabase SQL Editor AFTER schema.sql

-- ===================== TABLE =====================

CREATE TABLE IF NOT EXISTS public.invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  account_id  uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  invited_by  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  used_at     timestamptz,
  expires_at  timestamptz NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- ===================== RLS =====================

CREATE POLICY "invites_select_own_account" ON public.invites
  FOR SELECT USING (account_id = public.get_my_account_id());

CREATE POLICY "invites_insert_own_account" ON public.invites
  FOR INSERT WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "invites_delete_own_account" ON public.invites
  FOR DELETE USING (account_id = public.get_my_account_id());

-- ===================== RPCs =====================

-- Fetch an invite by token (SECURITY DEFINER — callable without a session)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token uuid)
RETURNS TABLE (email text, owner_email text, is_valid boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.email,
    (SELECT au.email FROM auth.users au WHERE au.id = i.invited_by)::text AS owner_email,
    (i.used_at IS NULL AND i.expires_at > now()) AS is_valid
  FROM public.invites i
  WHERE i.token = p_token;
END;
$$;

-- Create an invite (enforces owner-only, lowercases email, revokes old pending invites)
CREATE OR REPLACE FUNCTION public.create_invite(p_email text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_role       text;
  v_token      uuid;
  v_email      text := lower(trim(p_email));
BEGIN
  SELECT account_id, role INTO v_account_id, v_role
  FROM public.profiles WHERE id = auth.uid();

  IF v_role <> 'owner' THEN
    RAISE EXCEPTION 'only_owners_can_invite';
  END IF;

  -- Revoke any previous pending invite for the same email+account
  UPDATE public.invites
  SET used_at = now()
  WHERE lower(email) = v_email
    AND account_id = v_account_id
    AND used_at IS NULL;

  INSERT INTO public.invites (email, account_id, invited_by)
  VALUES (v_email, v_account_id, auth.uid())
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

-- ===================== UPDATED TRIGGER =====================
-- Replaces the original handle_new_user from schema.sql

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
    -- Invited path: join the inviter's account as member
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
  END IF;

  RETURN NEW;
END;
$$;
