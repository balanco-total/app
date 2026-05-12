import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/rateLimit'

export async function GET() {
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

  const { data: connections, error } = await supabase
    .from('bank_connections')
    .select('id, item_id, connector_name, connector_logo, last_synced_at, created_at')
    .eq('account_id', profile.account_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erro ao listar conexões.' }, { status: 500 })

  return NextResponse.json(connections ?? [])
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, account_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  if (profile.role !== 'owner')
    return NextResponse.json({ error: 'Apenas o proprietário pode remover conexões bancárias.' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.id !== 'string')
    return NextResponse.json({ error: 'ID da conexão é obrigatório.' }, { status: 400 })

  if (!checkRateLimit(`pluggy-delete:${user.id}`, 20, 60 * 60 * 1000))
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const admin = createAdminClient()

  const { data: conn } = await admin
    .from('bank_connections')
    .select('id, account_id')
    .eq('id', body.id)
    .maybeSingle()

  if (!conn || conn.account_id !== profile.account_id)
    return NextResponse.json({ error: 'Conexão não encontrada.' }, { status: 404 })

  const { error } = await admin.from('bank_connections').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: 'Erro ao remover conexão.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
