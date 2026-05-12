import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const { data: account } = await supabase
    .from('accounts')
    .select('id, stripe_subscription_id, subscription_status, trial_ends_at')
    .eq('id', profile.account_id)
    .single()

  if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey || !account.stripe_subscription_id) {
    return NextResponse.json({
      invoices: [],
      status: account.subscription_status,
      trialEndsAt: account.trial_ends_at,
      subscriptionId: null,
      nextBillingDate: null,
    })
  }

  const stripe = new Stripe(secretKey)

  const subscription = await stripe.subscriptions.retrieve(account.stripe_subscription_id)
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  const invoicesRes = await stripe.invoices.list({ customer: customerId, limit: 24 })

  const invoices = invoicesRes.data.map(inv => ({
    id: inv.id,
    amount: inv.amount_paid / 100,
    currency: inv.currency,
    status: inv.status,
    created: inv.created,
    period_start: inv.period_start,
    period_end: inv.period_end,
    hosted_invoice_url: inv.hosted_invoice_url,
  }))

  const firstItem = subscription.items.data[0]

  return NextResponse.json({
    invoices,
    status: account.subscription_status,
    trialEndsAt: account.trial_ends_at,
    subscriptionId: account.stripe_subscription_id,
    nextBillingDate: firstItem?.current_period_end ?? null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })
}
