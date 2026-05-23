-- Substitui a função diária (get_expenses_due_today) pela semanal.
-- O cron agora dispara apenas às segundas-feiras 08:00 BRT (11:00 UTC)
-- e envia ao usuário a lista de despesas não pagas com vencimento entre
-- sábado (current_date - 2) e domingo (current_date + 6), inclusivos,
-- usando comparação em UTC para não depender do fuso da sessão.

drop function if exists public.get_expenses_due_today();

create or replace function public.get_expenses_due_this_week()
returns setof public.expenses
language sql
security definer
set search_path = public
as $$
  select *
  from public.expenses
  where paid_at is null
    and (date at time zone 'UTC')::date between
          (now() at time zone 'UTC')::date - 2
      and (now() at time zone 'UTC')::date + 6
$$;

revoke all on function public.get_expenses_due_this_week() from public, anon, authenticated;
grant execute on function public.get_expenses_due_this_week() to service_role;
