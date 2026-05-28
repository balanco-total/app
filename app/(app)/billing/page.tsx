import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BillingPage from '@/components/BillingPage'

export default async function AppBillingPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, account_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/api/auth/signout')

  const { data: account } = await supabase
    .from('accounts')
    .select('id, trial_ends_at, subscription_status')
    .eq('id', profile.account_id)
    .single()

  if (!account) redirect('/api/auth/signout')

  // Already active — send to app
  if (account.subscription_status === 'active') redirect('/')

  return <BillingPage profile={profile} account={account} />
}
