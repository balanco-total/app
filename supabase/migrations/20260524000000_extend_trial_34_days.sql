ALTER TABLE public.accounts
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '34 days');
