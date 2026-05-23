import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { escapeHtml, sendMail } from '@/lib/email'

const ALLOWED_CATEGORIES = ['Reclamação', 'Elogio', 'Dúvida', 'Sugestão', 'Bug', 'Outro'] as const
type Category = (typeof ALLOWED_CATEGORIES)[number]

const MIN_MESSAGE = 10
const MAX_MESSAGE = 2000

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  let body: { category?: unknown; message?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const category = body.category
  const messageRaw = body.message

  if (typeof category !== 'string' || !ALLOWED_CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 })
  }

  if (typeof messageRaw !== 'string') {
    return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 })
  }
  const message = messageRaw.trim()
  if (message.length < MIN_MESSAGE) {
    return NextResponse.json({ error: `Mensagem deve ter ao menos ${MIN_MESSAGE} caracteres.` }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: `Mensagem deve ter no máximo ${MAX_MESSAGE} caracteres.` }, { status: 400 })
  }

  const to = process.env.SUPPORT_EMAIL
  if (!to) {
    console.error('[support] SUPPORT_EMAIL environment variable missing')
    return NextResponse.json({ error: 'Configuração de e-mail incompleta.' }, { status: 500 })
  }

  const subject = `Suporte [${category}] - ${profile.name}`
  const text = `De: ${profile.name} <${user.email}>\nCategoria: ${category}\n\n${message}`
  const html = `
    <p><strong>De:</strong> ${escapeHtml(profile.name)} &lt;${escapeHtml(user.email ?? '')}&gt;</p>
    <p><strong>Categoria:</strong> ${escapeHtml(category)}</p>
    <p><strong>Mensagem:</strong></p>
    <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
  `

  try {
    await sendMail({ to, replyTo: user.email, subject, text, html })
  } catch (err) {
    console.error('[support] Failed to send email:', err)
    return NextResponse.json({ error: 'Falha ao enviar mensagem. Tente novamente.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
