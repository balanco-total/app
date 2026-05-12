import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/rateLimit'

// DELETE — permanently removes the entire account and all its data
export async function DELETE() {
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
    return NextResponse.json({ error: 'Apenas o proprietário pode apagar a conta.' }, { status: 403 })

  if (!checkRateLimit(`delete-account:${user.id}`, 3, 60 * 60 * 1000))
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const admin = createAdminClient()

  // Collect all user IDs before deleting (auth.users must be cleaned up separately)
  const { data: members } = await admin
    .from('profiles')
    .select('id')
    .eq('account_id', profile.account_id)

  const userIds = (members ?? []).map(m => m.id)

  // Deleting the account cascades to: profiles, categories, expenses
  const { error: accountErr } = await admin
    .from('accounts')
    .delete()
    .eq('id', profile.account_id)

  if (accountErr)
    return NextResponse.json({ error: 'Erro ao apagar a conta.' }, { status: 500 })

  // Remove each member from Supabase Auth (sessions invalidated, login blocked)
  for (const uid of userIds) {
    await admin.auth.admin.deleteUser(uid)
  }

  return NextResponse.json({ success: true })
}
