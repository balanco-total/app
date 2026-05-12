import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const ABACATEPAY_API = 'https://api.abacatepay.com/v2'

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

  const apiKey = process.env.ABACATEPAY_API_KEY
  const productId = process.env.ABACATEPAY_PRODUCT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!apiKey || !productId) {
    console.error('[billing] Missing ABACATEPAY_API_KEY or ABACATEPAY_PRODUCT_ID')
    return NextResponse.json({ error: 'Configuração de pagamento incompleta.' }, { status: 500 })
  }

  // Only include redirect URLs when APP_URL is a real public domain
  const isPublicUrl = appUrl && !appUrl.includes('localhost')
  const redirectUrls = isPublicUrl
    ? {
        completionUrl: `${appUrl}/app/billing/success`,
        returnUrl: `${appUrl}/app/billing`,
      }
    : {}

  const payload = {
    items: [{ id: productId, quantity: 1 }],
    externalId: profile.account_id,
    methods: ['CARD'],
    ...redirectUrls,
  }

  console.info('[billing] Creating subscription:', { productId, accountId: profile.account_id, appUrl })

  const res = await fetch(`${ABACATEPAY_API}/subscriptions/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const json = await res.json()

  if (!res.ok) {
    console.error('[billing] AbacatePay error:', res.status, JSON.stringify(json))
    return NextResponse.json({ error: 'Erro ao criar assinatura. Tente novamente.' }, { status: 502 })
  }

  console.info('[billing] AbacatePay response:', JSON.stringify(json))

  const checkoutUrl: string | undefined = json?.data?.url

  if (!checkoutUrl) {
    console.error('[billing] Missing url in response:', JSON.stringify(json))
    return NextResponse.json({ error: 'Resposta inválida do gateway de pagamento.' }, { status: 502 })
  }

  return NextResponse.json({ url: checkoutUrl })
}
