import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { invoiceCycleForDate } from '@/lib/credit-card'

export const dynamic = 'force-dynamic'

type CardRow = {
  id: string
  account_id: string
  closing_day: number
  due_day: number
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/close-invoices] CRON_SECRET missing')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const todayStr = new Date().toISOString().slice(0, 10)

  // 1) Close any open invoice whose closing date has passed.
  const { data: closed, error: closeError } = await admin
    .from('credit_card_invoices')
    .update({ status: 'closed' })
    .eq('status', 'open')
    .lt('closing_date', todayStr)
    .select('id')

  if (closeError) {
    console.error('[cron/close-invoices] failed to close invoices:', closeError)
    return NextResponse.json({ error: 'Failed to close invoices' }, { status: 500 })
  }

  // 2) Ensure every card has an open invoice for its current cycle.
  const { data: cards, error: cardsError } = await admin
    .from('credit_cards')
    .select('id, account_id, closing_day, due_day')

  if (cardsError) {
    console.error('[cron/close-invoices] failed to fetch cards:', cardsError)
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
  }

  const cardRows = (cards ?? []) as CardRow[]

  // Desired current-cycle invoice per card
  const desired = cardRows.map(card => ({
    card,
    cycle: invoiceCycleForDate(todayStr, card.closing_day, card.due_day),
  }))

  let opened = 0
  if (desired.length > 0) {
    const cardIds = desired.map(d => d.card.id)
    const { data: existing } = await admin
      .from('credit_card_invoices')
      .select('credit_card_id, reference_month')
      .in('credit_card_id', cardIds)

    const existingKeys = new Set(
      (existing ?? []).map(inv => `${inv.credit_card_id}:${inv.reference_month}`),
    )

    const toCreate = desired
      .filter(d => !existingKeys.has(`${d.card.id}:${d.cycle.reference_month}`))
      .map(d => ({
        account_id: d.card.account_id,
        credit_card_id: d.card.id,
        reference_month: d.cycle.reference_month,
        closing_date: d.cycle.closing_date,
        due_date: d.cycle.due_date,
        status: 'open',
      }))

    if (toCreate.length > 0) {
      const { data: created, error: createError } = await admin
        .from('credit_card_invoices')
        .insert(toCreate)
        .select('id')
      if (createError) {
        console.error('[cron/close-invoices] failed to open invoices:', createError)
        return NextResponse.json({ error: 'Failed to open invoices' }, { status: 500 })
      }
      opened = created?.length ?? 0
    }
  }

  return NextResponse.json({ closed: closed?.length ?? 0, opened, cards: cardRows.length })
}
