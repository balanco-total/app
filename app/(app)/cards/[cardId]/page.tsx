import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import CardDetailPage from '@/components/CardDetailPage'

export default async function Page({ params }: { params: { cardId: string } }) {
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

  const [accountRes, cardRes, banksRes, categoriesRes] = await Promise.all([
    supabase.from('accounts').select('id, trial_ends_at, subscription_status').eq('id', profile.account_id).single(),
    supabase.from('credit_cards').select('*').eq('id', params.cardId).single(),
    supabase.from('financial_accounts').select('id, name, is_default').eq('account_id', profile.account_id).order('created_at', { ascending: true }),
    supabase.from('categories').select('id, name, color').eq('account_id', profile.account_id),
  ])

  if (!cardRes.data) notFound()

  const { data: invoices } = await supabase
    .from('credit_card_invoices')
    .select('*')
    .eq('credit_card_id', cardRes.data.id)
    .order('reference_month', { ascending: true })

  const invoiceIds = (invoices ?? []).map(i => i.id)
  const { data: expenses } = invoiceIds.length
    ? await supabase
        .from('expenses')
        .select('id, user_id, description, amount, category_id, date, credit_card_invoice_id')
        .in('credit_card_invoice_id', invoiceIds)
        .order('date', { ascending: false })
    : { data: [] }

  return (
    <CardDetailPage
      user={user}
      profile={profile}
      account={accountRes.data ?? null}
      card={cardRes.data}
      initialInvoices={invoices ?? []}
      initialExpenses={expenses ?? []}
      bankAccounts={banksRes.data ?? []}
      categories={categoriesRes.data ?? []}
    />
  )
}
