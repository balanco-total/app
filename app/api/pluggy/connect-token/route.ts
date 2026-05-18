import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/rateLimit'
import { getPluggyApiKey, PLUGGY_BASE } from '@/utils/pluggy'

export async function POST(request: Request) {
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

  if (!checkRateLimit(`pluggy-connect-token:${user.id}`, 20, 60 * 60 * 1000))
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em 1 hora.' }, { status: 429 })

  if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) {
    console.error('[pluggy/connect-token] Missing PLUGGY_CLIENT_ID or PLUGGY_CLIENT_SECRET')
    return NextResponse.json({ error: 'Configuração de Open Finance incompleta.' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const itemId = typeof body?.itemId === 'string' ? body.itemId.trim() : undefined

  try {
    const apiKey = await getPluggyApiKey()

    const connectTokenBody: Record<string, unknown> = {
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }
    if (itemId) {
      const { data: ownedConnection } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('account_id', profile.account_id)
        .eq('item_id', itemId)
        .maybeSingle()
      if (!ownedConnection)
        return NextResponse.json({ error: 'Conexão não encontrada.' }, { status: 404 })
      connectTokenBody.options = { url: itemId }
    }

    const res = await fetch(`${PLUGGY_BASE}/connect_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify(connectTokenBody),
    })
    if (!res.ok) throw new Error(`Pluggy /connect_token failed: ${res.status}`)
    const { accessToken } = await res.json()

    return NextResponse.json({ accessToken })
  } catch (err) {
    console.error('[pluggy/connect-token]', err)
    return NextResponse.json({ error: 'Erro ao conectar com Pluggy.' }, { status: 502 })
  }
}
