import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const MAX_DESCRIPTION = 60

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { description, amount, category_id } = body as Record<string, unknown>

  if (!description || String(description).trim().length === 0)
    return NextResponse.json({ error: 'Descrição é obrigatória.' }, { status: 400 })
  if (String(description).trim().length > MAX_DESCRIPTION)
    return NextResponse.json({ error: `Descrição deve ter no máximo ${MAX_DESCRIPTION} caracteres.` }, { status: 400 })
  if (typeof amount !== 'number' || amount <= 0)
    return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 400 })
  if (!category_id)
    return NextResponse.json({ error: 'Categoria é obrigatória.' }, { status: 400 })

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
    .from('expenses')
    .insert({
      account_id: profile.account_id,
      user_id: profile.id,
      description: String(description).trim(),
      amount,
      category_id,
      date: new Date().toISOString(),
    })
    .select('*, profiles(name)')
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao adicionar despesa.' }, { status: 500 })

  return NextResponse.json(data)
}
