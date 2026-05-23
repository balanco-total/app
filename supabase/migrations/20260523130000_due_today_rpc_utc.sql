-- Comparação em UTC para evitar dependência do fuso da sessão Postgres.
-- A versão anterior usava `date::date = current_date`, que avaliava o cast
-- no fuso da sessão. Em sessões em America/Sao_Paulo, despesas com
-- `date = YYYY-MM-DD 00:00:00+00` viravam o dia anterior e não eram
-- retornadas. Comparar a parte de data em UTC bate com a intenção do
-- usuário ao selecionar a data no formulário, independente do fuso
-- configurado no servidor.

create or replace function public.get_expenses_due_today()
returns setof public.expenses
language sql
security definer
set search_path = public
as $$
  select *
  from public.expenses
  where paid_at is null
    and (date at time zone 'UTC')::date = (now() at time zone 'UTC')::date
$$;

revoke all on function public.get_expenses_due_today() from public, anon, authenticated;
grant execute on function public.get_expenses_due_today() to service_role;
