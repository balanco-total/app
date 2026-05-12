import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UsersPage from '@/components/UsersPage'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, account_id, role, created_at, is_disabled')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'owner') redirect('/app')

  const { data: account } = await supabase
    .from('accounts')
    .select('id, trial_ends_at, subscription_status')
    .eq('id', profile.account_id)
    .single()

  return <UsersPage profile={profile} account={account ?? null} />
}
