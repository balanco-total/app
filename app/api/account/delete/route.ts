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
    return NextResponse.json({ error: 'Apenas o responsável pode excluir a conta.' }, { status: 403 })
  }

  const adminClient = createAdminClient()

  const { data: accountProfiles } = await adminClient
    .from('profiles')
    .select('id')
    .eq('account_id', profile.account_id)

  const { data: account } = await adminClient
    .from('accounts')
    .select('stripe_subscription_id')
    .eq('id', profile.account_id)
    .single()

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (secretKey && account?.stripe_subscription_id) {
    try {
      const stripe = new Stripe(secretKey)
      await stripe.subscriptions.cancel(account.stripe_subscription_id)
    } catch {
      // Continue even if Stripe cancellation fails — account deletion proceeds
    }
  }

  // Delete account (cascades to profiles, categories, expenses via FK)
  await adminClient
    .from('accounts')
    .delete()
    .eq('id', profile.account_id)

  // Delete all auth users in the account
  if (accountProfiles) {
    for (const p of accountProfiles) {
      await adminClient.auth.admin.deleteUser(p.id)
    }
  }

  return NextResponse.json({ ok: true })
}
