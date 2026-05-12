import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isValidFieldText } from '@/utils/validation'
import { checkRateLimit } from '@/utils/rateLimit'

const MIN_NAME = 3
const MAX_NAME = 60

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { name, color } = body as Record<string, string>
  const trimmed = name?.trim() ?? ''

  if (trimmed.length === 0)
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  if (trimmed.length < MIN_NAME)
    return NextResponse.json({ error: `Nome deve ter no mínimo ${MIN_NAME} caracteres.` }, { status: 400 })
  if (trimmed.length > MAX_NAME)
    return NextResponse.json({ error: `Nome deve ter no máximo ${MAX_NAME} caracteres.` }, { status: 400 })
  if (!isValidFieldText(trimmed))
    return NextResponse.json({ error: 'Nome contém caracteres inválidos.' }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  if (!checkRateLimit(`categories:${user.id}`, 20, 60 * 1000))
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }, { status: 429 })

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('account_id', profile.account_id)
    .ilike('name', trimmed)
    .maybeSingle()

  if (existing)
    return NextResponse.json({ error: `A categoria "${trimmed}" já existe.` }, { status: 409 })

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: trimmed, color, account_id: profile.account_id })
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'Erro ao adicionar categoria.' }, { status: 500 })

  return NextResponse.json(data)
}
