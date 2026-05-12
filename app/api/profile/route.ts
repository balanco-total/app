import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isValidFieldText } from '@/utils/validation'
import { checkRateLimit } from '@/utils/rateLimit'

const MAX_NAME = 60

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { name } = body as Record<string, string>
  const trimmed = name?.trim() ?? ''

  if (!trimmed) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  if (trimmed.length > MAX_NAME)
    return NextResponse.json({ error: `Nome deve ter no máximo ${MAX_NAME} caracteres.` }, { status: 400 })
  if (!isValidFieldText(trimmed))
    return NextResponse.json({ error: 'Nome contém caracteres inválidos.' }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  if (!checkRateLimit(`profile:${user.id}`, 10, 60 * 1000))
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }, { status: 429 })

  const { error } = await supabase
    .from('profiles')
    .update({ name: trimmed })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Erro ao atualizar perfil.' }, { status: 500 })

  return NextResponse.json({ success: true, name: trimmed })
}
