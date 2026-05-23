import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/rateLimit'
import { occurrenceDate } from '@/lib/recurring'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { recurring_expense_id, occurrence_year_month, action, amount_override } =
    body as Record<string, unknown>

  if (!recurring_expense_id || typeof recurring_expense_id !== 'string')
    return NextResponse.json({ error: 'recurring_expense_id é obrigatório.' }, { status: 400 })

  const ym = String(occurrence_year_month ?? '')
  if (!/^\d{4}-\d{2}$/.test(ym))
    return NextResponse.json({ error: 'occurrence_year_month inválido.' }, { status: 400 })

  if (!['pay', 'skip', 'edit'].includes(String(action)))
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, account_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  if (!checkRateLimit(`materialize:${user.id}`, 60, 60 * 1000))
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }, { status: 429 })

  // Load the template and verify it belongs to this account
  const { data: template } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('id', recurring_expense_id)
    .eq('account_id', profile.account_id)
    .single()

  if (!template) return NextResponse.json({ error: 'Despesa recorrente não encontrada.' }, { status: 404 })

  // Check if already materialized (upsert by unique index)
  const { data: existing } = await supabase
    .from('expenses')
    .select('*')
    .eq('recurring_expense_id', recurring_expense_id)
    .eq('occurrence_year_month', ym)
    .maybeSingle()

  if (existing) return NextResponse.json(existing)

  const now = new Date()
  const dateIso = `${occurrenceDate(ym, template.day_of_month)}T12:00:00.000Z`

  const resolvedAmount =
    action === 'edit' && typeof amount_override === 'number' && amount_override > 0
      ? amount_override
      : template.amount

  const row = {
    account_id: profile.account_id,
    user_id: template.user_id,
    description: template.description,
    amount: resolvedAmount,
    category_id: template.category_id,
    financial_account_id: template.financial_account_id,
    date: dateIso,
    paid_at: action === 'pay' ? now.toISOString() : null,
    skipped: action === 'skip',
    recurring_expense_id,
    occurrence_year_month: ym,
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert(row)
    .select('*, profiles(name)')
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao materializar ocorrência.' }, { status: 500 })
  return NextResponse.json(data)
}
