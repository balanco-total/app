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

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const [categoriesRes, expensesRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, color')
      .eq('account_id', profile.account_id)
      .order('name'),
    supabase
      .from('expenses')
      .select('id, user_id, amount, category_id, date, profiles(name)')
      .eq('account_id', profile.account_id)
      .gte('date', sixMonthsAgo.toISOString())
      .order('date', { ascending: false }),
  ])

  return (
    <ChartsPage
      profile={profile}
      categories={categoriesRes.data ?? []}
      expenses={(expensesRes.data ?? []) as any}
    />
  )
}
