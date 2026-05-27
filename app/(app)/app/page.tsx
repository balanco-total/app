import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import { DEFAULT_CATEGORIES } from '@/components/dashboard/helpers'

export default async function AppPage() {
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

  const accountId = profile.account_id
  const month = new Date().toISOString().slice(0, 7)
  const [y, m] = month.split('-').map(Number)
  const nextMonth = m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const [accountRes, categoriesRes, expensesRes, finAccountsRes, recurringRes, monthExpensesRes] =
    await Promise.all([
      supabase.from('accounts').select('id, trial_ends_at, subscription_status').eq('id', accountId).single(),
      supabase.from('categories').select('*').eq('account_id', accountId).order('name'),
      supabase.from('expenses').select('*, profiles(name)').eq('account_id', accountId).order('created_at', { ascending: false }).limit(50),
      supabase.from('financial_accounts').select('id, name, is_default').eq('account_id', accountId).order('created_at', { ascending: true }),
      supabase.from('recurring_expenses').select('*').eq('account_id', accountId).order('created_at', { ascending: true }),
      supabase.from('expenses').select('category_id, amount, paid_at, recurring_expense_id, occurrence_year_month, skipped').eq('account_id', accountId).gte('date', `${month}-01`).lt('date', nextMonth),
    ])

  // Seed defaults for brand-new accounts (matches the previous client-side seeding)
  let categories = categoriesRes.data ?? []
  if (categories.length === 0) {
    const { data: seeded } = await supabase
      .from('categories')
      .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, account_id: accountId })))
      .select()
    categories = seeded ?? []
  }

  let financialAccounts = finAccountsRes.data ?? []
  if (financialAccounts.length === 0) {
    const { data: seeded } = await supabase
      .from('financial_accounts')
      .insert({ account_id: accountId, name: 'Carteira', is_default: true })
      .select('id, name, is_default')
      .single()
    if (seeded) financialAccounts = [seeded]
  }

  return (
    <Dashboard
      user={user}
      profile={profile}
      account={accountRes.data}
      initialCategories={categories}
      initialExpenses={expensesRes.data ?? []}
      initialFinancialAccounts={financialAccounts}
      initialRecurring={recurringRes.data ?? []}
      initialMonthExpenses={monthExpensesRes.data ?? []}
      initialMonth={month}
    />
  )
}
