-- The /api/cron/due-this-week route now computes its date window in TypeScript
-- and queries `expenses` directly (also folding in recurring virtual occurrences).
-- The RPC introduced in 20260523140000_due_this_week_rpc.sql is no longer called.

drop function if exists public.get_expenses_due_this_week();
