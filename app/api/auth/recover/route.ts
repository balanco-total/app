import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { checkRateLimit } from '@/utils/rateLimit'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { email } = body as Record<string, unknown>
  if (!email || typeof email !== 'string' || !email.includes('@'))
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })

  const normalized = email.trim().toLowerCase()

  // Rate limit by IP — 5 attempts per hour
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (!checkRateLimit(`recover-ip:${ip}`, 5, 60 * 60 * 1000))
    return NextResponse.json({ success: true }) // silent — never reveal enumeration

  // Rate limit by email — 3 attempts per hour
  if (!checkRateLimit(`recover-email:${normalized}`, 3, 60 * 60 * 1000))
    return NextResponse.json({ success: true }) // silent

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const requestOrigin = request.headers.get('origin') ?? ''
  const safeOrigin = requestOrigin === appUrl ? requestOrigin : appUrl
  const admin = createAdminClient()

  // Fire and forget — never expose whether the email exists
  admin.auth.resetPasswordForEmail(normalized, {
    redirectTo: `${safeOrigin}/reset-password`,
  })

  return NextResponse.json({ success: true })
}
