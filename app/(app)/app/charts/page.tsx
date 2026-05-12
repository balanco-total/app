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
      .order('date', { ascending: false })
      .limit(2000),
  ])

  return (
    <ChartsPage
      profile={profile}
      categories={categoriesRes.data ?? []}
      expenses={(expensesRes.data ?? []) as any}
    />
  )
}
