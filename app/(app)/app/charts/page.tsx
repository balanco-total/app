import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ChartsPage from '@/components/ChartsPage'

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

  const [categoriesRes, expensesRes, membersRes, accountRes, financialAccountsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, color')
      .eq('account_id', profile.account_id)
      .order('name'),
    supabase
      .from('expenses')
      .select('id, user_id, amount, category_id, financial_account_id, date, profiles(name)')
      .eq('account_id', profile.account_id)
      .order('date', { ascending: false })
      .limit(2000),
    supabase
      .from('profiles')
      .select('id, name, account_id, role')
      .eq('account_id', profile.account_id),
    supabase
      .from('accounts')
      .select('id, trial_ends_at, subscription_status')
      .eq('id', profile.account_id)
      .single(),
    supabase
      .from('financial_accounts')
      .select('id, name')
      .eq('account_id', profile.account_id)
      .order('created_at', { ascending: true }),
  ])

  return (
    <ChartsPage
      profile={profile}
      categories={categoriesRes.data ?? []}
      expenses={(expensesRes.data ?? []) as any}
      members={membersRes.data ?? []}
      account={accountRes.data ?? null}
      financialAccounts={financialAccountsRes.data ?? []}
    />
  )
}
