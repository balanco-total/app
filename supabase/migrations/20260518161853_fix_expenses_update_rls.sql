-- Fix: expenses_update_own RLS policy was missing account_id check,
-- allowing a user to change the account_id of their own expenses to
-- a different account, injecting data into another organization's space.
DROP POLICY IF EXISTS "expenses_update_own" ON public.expenses;

CREATE POLICY "expenses_update_own" ON public.expenses
  FOR UPDATE
  USING (user_id = auth.uid() AND account_id = public.get_my_account_id())
  WITH CHECK (user_id = auth.uid() AND account_id = public.get_my_account_id());
