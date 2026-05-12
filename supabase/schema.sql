-- BalançoTotal — Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- After running: disable email confirmation in Dashboard → Authentication → Providers → Email

-- ===================== TABLES =====================

CREATE TABLE IF NOT EXISTS public.accounts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name       varchar(60) NOT NULL CHECK (char_length(name) >= 1),
  role       text        NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  color      text        NOT NULL DEFAULT 'bg-gray-500',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid           NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id     uuid           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description text           NOT NULL,
  amount      numeric(12, 2) NOT NULL CHECK (amount > 0),
  category_id uuid           REFERENCES public.categories(id) ON DELETE SET NULL,
  date        timestamptz    NOT NULL DEFAULT now(),
  created_at  timestamptz    NOT NULL DEFAULT now()
);

-- ===================== FUNCTIONS =====================

-- Returns the current user's account_id — SECURITY DEFINER breaks RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_account_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Triggered on new user creation: auto-creates account + profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id uuid;
BEGIN
  INSERT INTO public.accounts (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'name', 'Minha Conta'))
  RETURNING id INTO new_account_id;

  INSERT INTO public.profiles (id, account_id, name, role)
  VALUES (
    NEW.id,
    new_account_id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    'owner'
  );

  RETURN NEW;
END;
$$;

-- ===================== TRIGGERS =====================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================== ROW LEVEL SECURITY =====================

ALTER TABLE public.accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses  ENABLE ROW LEVEL SECURITY;

-- accounts
CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT USING (id = public.get_my_account_id());

-- profiles
CREATE POLICY "profiles_select_own_account" ON public.profiles
  FOR SELECT USING (account_id = public.get_my_account_id());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- categories
CREATE POLICY "categories_all_own_account" ON public.categories
  FOR ALL
  USING (account_id = public.get_my_account_id())
  WITH CHECK (account_id = public.get_my_account_id());

-- expenses
CREATE POLICY "expenses_select_own_account" ON public.expenses
  FOR SELECT USING (account_id = public.get_my_account_id());

CREATE POLICY "expenses_insert_own" ON public.expenses
  FOR INSERT WITH CHECK (
    account_id = public.get_my_account_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "expenses_update_own" ON public.expenses
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "expenses_delete_own" ON public.expenses
  FOR DELETE USING (user_id = auth.uid());
