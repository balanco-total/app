import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isValidFieldText } from '@/utils/validation'

const MAX_DESCRIPTION = 60
const MAX_AMOUNT = 1_000_000

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { recurring_expense_id, amount, description } = body as Record<string, unknown>

  if (!recurring_expense_id || typeof recurring_expense_id !== 'string')
    return NextResponse.json({ error: 'recurring_expense_id é obrigatório.' }, { status: 400 })

  const updates: Record<string, unknown> = {}

  if (amount !== undefined) {
    if (typeof amount !== 'number' || amount <= 0)
      return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 400 })
    if (amount > MAX_AMOUNT)
      return NextResponse.json({ error: 'Valor não pode ser maior que R$ 1.000.000,00.' }, { status: 400 })
    updates.amount = amount
  }

  if (description !== undefined) {
    const desc = String(description).trim()
    if (desc.length === 0 || desc.length > MAX_DESCRIPTION)
      return NextResponse.json({ error: 'Descrição inválida.' }, { status: 400 })
    if (!isValidFieldText(desc))
      return NextResponse.json({ error: 'Descrição contém caracteres inválidos.' }, { status: 400 })
    updates.description = desc
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })

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
    .update(updates)
    .eq('id', recurring_expense_id)
    .eq('account_id', profile.account_id)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'Erro ao atualizar recorrência.' }, { status: 500 })
  return NextResponse.json(data)
}
