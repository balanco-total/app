import { createClient } from '@/utils/supabase/server'
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
    return NextResponse.json({ error: 'Apenas o responsável da conta pode assinar.' }, { status: 403 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_PRICE_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!secretKey || !priceId) {
    console.error('[billing] Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID')
    return NextResponse.json({ error: 'Configuração de pagamento incompleta.' }, { status: 500 })
  }

  const stripe = new Stripe(secretKey)

  console.info('[billing] Creating Stripe checkout session:', { priceId, accountId: profile.account_id, appUrl })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: profile.account_id,
    customer_email: user.email,
    success_url: `${appUrl}/billing/success`,
    cancel_url: `${appUrl}/billing`,
    locale: 'pt-BR',
  })

  console.info('[billing] Stripe session created:', session.id)

  if (!session.url) {
    console.error('[billing] Missing url in Stripe session:', session.id)
    return NextResponse.json({ error: 'Resposta inválida do gateway de pagamento.' }, { status: 502 })
  }

  return NextResponse.json({ url: session.url })
}
