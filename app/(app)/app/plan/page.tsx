import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PlanPage from '@/components/PlanPage'

export default async function AppPlanPage() {
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

  const { data: members } = await supabase
    .from('profiles')
    .select('id')
    .eq('account_id', profile.account_id)

  return <PlanPage profile={profile} memberCount={members?.length ?? 0} />
}
