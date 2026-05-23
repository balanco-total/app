-- Returns all unpaid expenses whose due date (date portion only, ignoring time)
-- equals today. Used by the daily cron job /api/cron/due-today that emails
-- each account's members.

create or replace function public.get_expenses_due_today()
returns setof public.expenses
language sql
security definer
set search_path = public
as $$
  select *
  from public.expenses
  where paid_at is null
    and date::date = current_date
$$;

revoke all on function public.get_expenses_due_today() from public, anon, authenticated;
grant execute on function public.get_expenses_due_today() to service_role;
