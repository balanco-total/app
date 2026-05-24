import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { recurring_expense_id, end_year_month } = body as Record<string, unknown>

  if (!recurring_expense_id || typeof recurring_expense_id !== 'string')
    return NextResponse.json({ error: 'recurring_expense_id é obrigatório.' }, { status: 400 })

  const endYm = String(end_year_month ?? '')
  if (!/^\d{4}-\d{2}$/.test(endYm))
    return NextResponse.json({ error: 'end_year_month inválido.' }, { status: 400 })

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

  const { data, error } = await supabase
    .from('recurring_expenses')
    .update({ end_year_month: endYm })
    .eq('id', recurring_expense_id)
    .eq('account_id', profile.account_id)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'Erro ao encerrar recorrência.' }, { status: 500 })
  return NextResponse.json(data)
}
