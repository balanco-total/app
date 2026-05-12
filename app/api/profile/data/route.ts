import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/rateLimit'

// DELETE — removes all expenses from the account (owner only)
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
    return NextResponse.json({ error: 'Apenas o proprietário pode excluir os dados da conta.' }, { status: 403 })

  if (!checkRateLimit(`profile-data:${user.id}`, 3, 60 * 60 * 1000))
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em 1 hora.' }, { status: 429 })

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('account_id', profile.account_id)

  if (error) return NextResponse.json({ error: 'Erro ao excluir os dados.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
