import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST() {
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
  if (profile.role !== 'owner') {
    return NextResponse.json({ error: 'Apenas o responsável pode cancelar a assinatura.' }, { status: 403 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('stripe_subscription_id, subscription_status')
    .eq('id', profile.account_id)
    .single()

  if (!account?.stripe_subscription_id) {
    return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada.' }, { status: 400 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Configuração de pagamento incompleta.' }, { status: 500 })

  const stripe = new Stripe(secretKey)

  await stripe.subscriptions.cancel(account.stripe_subscription_id)

  const adminClient = createAdminClient()
  await adminClient
    .from('accounts')
    .update({ subscription_status: 'canceled' })
    .eq('id', profile.account_id)

  return NextResponse.json({ ok: true })
}
