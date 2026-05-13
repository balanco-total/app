import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AccountsPage from '@/components/AccountsPage'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, account_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: account } = await supabase
    .from('accounts')
    .select('id, trial_ends_at, subscription_status')
    .eq('id', profile.account_id)
    .single()

  return <AccountsPage profile={profile} account={account ?? null} />
}
