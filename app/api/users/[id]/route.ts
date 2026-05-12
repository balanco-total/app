import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/rateLimit'

async function getCallerOwnerProfile(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, account_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') return null
  return profile
}

// DELETE — remove member, optionally migrating their expenses to the owner
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const caller = await getCallerOwnerProfile(supabase)
  if (!caller) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  if (!checkRateLimit(`users-mgmt:${caller.id}`, 20, 60 * 1000))
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }, { status: 429 })

  const targetId = params.id

  if (targetId === caller.id)
    return NextResponse.json({ error: 'Não é possível excluir a si mesmo.' }, { status: 400 })

  const { data: target } = await supabase
    .from('profiles')
    .select('id, account_id, role')
    .eq('id', targetId)
    .single()

  if (!target || target.account_id !== caller.account_id)
    return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 })

  if (target.role === 'owner')
    return NextResponse.json({ error: 'Não é possível excluir um proprietário.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const migrate = (body as Record<string, unknown>).migrate === true

  const admin = createAdminClient()

  if (migrate) {
    const { error } = await admin
      .from('expenses')
      .update({ user_id: caller.id })
      .eq('user_id', targetId)

    if (error)
      return NextResponse.json({ error: 'Erro ao migrar lançamentos.' }, { status: 500 })
  }

  // Deleting auth.users cascades → profiles → expenses (for any remaining)
  const { error } = await admin.auth.admin.deleteUser(targetId)
  if (error)
    return NextResponse.json({ error: 'Erro ao excluir usuário.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

// PATCH — enable or disable a member
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { disabled } = body as { disabled: boolean }
  if (typeof disabled !== 'boolean')
    return NextResponse.json({ error: 'Campo "disabled" inválido.' }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const caller = await getCallerOwnerProfile(supabase)
  if (!caller) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  if (!checkRateLimit(`users-mgmt:${caller.id}`, 20, 60 * 1000))
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }, { status: 429 })

  const targetId = params.id

  if (targetId === caller.id)
    return NextResponse.json({ error: 'Não é possível alterar o próprio status.' }, { status: 400 })

  const { data: target } = await supabase
    .from('profiles')
    .select('id, account_id, role')
    .eq('id', targetId)
    .single()

  if (!target || target.account_id !== caller.account_id)
    return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 })

  if (target.role === 'owner')
    return NextResponse.json({ error: 'Não é possível desabilitar um proprietário.' }, { status: 400 })

  const admin = createAdminClient()

  // Update profile flag
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ is_disabled: disabled })
    .eq('id', targetId)

  if (profileErr)
    return NextResponse.json({ error: 'Erro ao atualizar perfil.' }, { status: 500 })

  // Ban/unban in Supabase Auth — prevents token refresh and new sign-ins
  const { error: authErr } = await admin.auth.admin.updateUserById(targetId, {
    ban_duration: disabled ? '876000h' : 'none',
  })

  if (authErr) {
    // Rollback the profile flag
    await admin.from('profiles').update({ is_disabled: !disabled }).eq('id', targetId)
    return NextResponse.json({ error: 'Erro ao atualizar autenticação.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
