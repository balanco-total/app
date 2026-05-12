import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// AbacatePay's fixed signing key — used to verify X-Webhook-Signature (HMAC-SHA256, base64)
const ABACATEPAY_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

type AbacatepayEvent = {
  event: string
  data: {
    subscription?: { id?: string }
    payment?: { externalId?: string }
  }
}

function verifySignature(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('base64')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  // First gate: validate URL secret query param
  const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('Missing ABACATEPAY_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret') ?? ''
  if (querySecret !== webhookSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Second gate: validate HMAC signature header
  const rawBody = await request.text()
  const signature = request.headers.get('x-webhook-signature') ?? ''
  if (!signature || !verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: AbacatepayEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // externalId is under data.payment.externalId (= our account_id)
  const accountId = event.data?.payment?.externalId
  const subscriptionId = event.data?.subscription?.id

  if (!accountId) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createAdminClient()

  switch (event.event) {
    case 'subscription.completed':
    case 'subscription.renewed':
      await supabase
        .from('accounts')
        .update({
          subscription_status: 'active',
          abacatepay_subscription_id: subscriptionId ?? null,
        })
        .eq('id', accountId)
      break

    case 'subscription.cancelled':
      await supabase
        .from('accounts')
        .update({ subscription_status: 'canceled' })
        .eq('id', accountId)
      break

    case 'subscription.overdue':
      await supabase
        .from('accounts')
        .update({ subscription_status: 'past_due' })
        .eq('id', accountId)
      break
  }

  return NextResponse.json({ ok: true })
}
