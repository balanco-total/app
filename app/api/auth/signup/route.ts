import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const MAX_NAME = 60
const MAX_EMAIL = 100
const MAX_PASSWORD = 40

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { name, email, password } = body as Record<string, string>

  if (!name || name.trim().length === 0)
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  if (name.trim().length > MAX_NAME)
    return NextResponse.json({ error: `Nome deve ter no máximo ${MAX_NAME} caracteres.` }, { status: 400 })
  if (!email || email.length === 0)
    return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 })
  if (email.length > MAX_EMAIL)
    return NextResponse.json({ error: `E-mail deve ter no máximo ${MAX_EMAIL} caracteres.` }, { status: 400 })
  if (!password || password.length === 0)
    return NextResponse.json({ error: 'Senha é obrigatória.' }, { status: 400 })
  if (password.length > MAX_PASSWORD)
    return NextResponse.json({ error: `Senha deve ter no máximo ${MAX_PASSWORD} caracteres.` }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name.trim() } },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
