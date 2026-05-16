import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getPluggyApiKey, PLUGGY_BASE } from '@/utils/pluggy'

const MAX_ROWS = 1000
const MAX_AMOUNT = 1_000_000

type PluggyTransaction = {
  id: string
  date: string
  description: string
  amount: number
  type: 'DEBIT' | 'CREDIT'
  category?: string
  creditCardMetadata?: {
    installmentNumber?: number
    totalInstallments?: number
  }
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function verifySignature(rawBody: string, header: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const received = header.startsWith('sha256=') ? header.slice(7) : header
  try {
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PLUGGY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[pluggy/webhook] Missing PLUGGY_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-pluggy-signature') ?? ''

  if (!verifySignature(rawBody, signature, webhookSecret)) {
    console.warn('[pluggy/webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let payload: { event?: string; itemId?: string }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, itemId } = payload

  // Only sync on item/updated; acknowledge everything else silently
  if (event !== 'item/updated' || typeof itemId !== 'string' || !itemId.trim()) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const admin = createAdminClient()

  const { data: connection } = await admin
    .from('bank_connections')
    .select('id, account_id, user_id, connector_name, last_synced_at')
    .eq('item_id', itemId)
    .maybeSingle()

  if (!connection) {
    console.warn(`[pluggy/webhook] No connection found for itemId=${itemId}`)
    return NextResponse.json({ ok: true, skipped: true })
  }

  const now = new Date()
  let fromDate: Date
  if (connection.last_synced_at) {
    fromDate = new Date(connection.last_synced_at)
    fromDate.setDate(fromDate.getDate() - 7)
  } else {
    fromDate = new Date(now)
    fromDate.setDate(fromDate.getDate() - 90)
  }
  const from = toISODate(fromDate)
  const to = toISODate(now)

  try {
    const apiKey = await getPluggyApiKey()

    const accountsRes = await fetch(
      `${PLUGGY_BASE}/accounts?itemId=${encodeURIComponent(itemId)}`,
      { headers: { 'X-API-KEY': apiKey } }
    )
    if (!accountsRes.ok) throw new Error(`Pluggy /accounts: ${accountsRes.status}`)
    const { results: pluggyAccounts } = await accountsRes.json()

    const allTransactions: PluggyTransaction[] = []
    for (const acct of (pluggyAccounts ?? []) as Array<{ id: string }>) {
      const txRes = await fetch(
        `${PLUGGY_BASE}/transactions?accountId=${encodeURIComponent(acct.id)}&from=${from}&to=${to}`,
        { headers: { 'X-API-KEY': apiKey } }
      )
      if (!txRes.ok) continue
      const { results } = await txRes.json()
      for (const tx of (results ?? []) as PluggyTransaction[]) {
        if (tx.type === 'DEBIT' && tx.amount !== 0) allTransactions.push(tx)
      }
      if (allTransactions.length >= MAX_ROWS) break
    }

    const transactions = allTransactions.slice(0, MAX_ROWS)

    if (transactions.length === 0) {
      await admin.from('bank_connections').update({ last_synced_at: now.toISOString() }).eq('id', connection.id)
      return NextResponse.json({ ok: true, imported: 0 })
    }

    // Dedup against already-imported transactions
    const incomingIds = transactions.map(t => t.id)
    const { data: existingTxns } = await admin
      .from('expenses')
      .select('pluggy_transaction_id')
      .eq('account_id', connection.account_id)
      .in('pluggy_transaction_id', incomingIds)

    const alreadyImported = new Set(
      (existingTxns ?? []).map((r: { pluggy_transaction_id: string }) => r.pluggy_transaction_id)
    )
    const newTransactions = transactions.filter(t => !alreadyImported.has(t.id))

    if (newTransactions.length === 0) {
      await admin.from('bank_connections').update({ last_synced_at: now.toISOString() }).eq('id', connection.id)
      return NextResponse.json({ ok: true, imported: 0 })
    }

    // Resolve or create matching financial account
    let financialAccountId: string | null = null
    if (connection.connector_name) {
      const { data: existing } = await admin
        .from('financial_accounts')
        .select('id')
        .eq('account_id', connection.account_id)
        .ilike('name', connection.connector_name)
        .maybeSingle()

      if (existing) {
        financialAccountId = existing.id
      } else {
        const { data: created } = await admin
          .from('financial_accounts')
          .insert({ account_id: connection.account_id, name: connection.connector_name })
          .select('id')
          .single()
        financialAccountId = created?.id ?? null
      }
    }

    // Category lookup
    const { data: categories } = await admin
      .from('categories')
      .select('id, name')
      .eq('account_id', connection.account_id)

    const catMap = new Map<string, string>()
    for (const c of (categories ?? [])) catMap.set(c.name.toLowerCase(), c.id)

    let othersCategoryId: string | null = catMap.get('outros') ?? null
    if (!othersCategoryId) {
      const { data: created } = await admin
        .from('categories')
        .insert({ account_id: connection.account_id, name: 'Outros', color: 'bg-gray-500' })
        .select('id')
        .single()
      othersCategoryId = created?.id ?? null
    }

    const DEFAULT_DESC = 'Transação bancária'
    const insertRows = newTransactions
      .map(tx => {
        let desc = (tx.description ?? '')
          .replace(/[\x00-\x1F\x7F]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 55) || DEFAULT_DESC

        const amount = Math.round(Math.min(Math.abs(tx.amount), MAX_AMOUNT) * 100) / 100
        if (amount <= 0) return null

        const isoDate = `${tx.date.slice(0, 10)}T12:00:00.000Z`
        const catKey = (tx.category ?? '').toLowerCase().trim()
        const categoryId = (catKey && catMap.has(catKey)) ? catMap.get(catKey)! : othersCategoryId

        if (tx?.creditCardMetadata?.installmentNumber && tx?.creditCardMetadata?.totalInstallments && desc !== DEFAULT_DESC) {
          desc = `${desc} ${tx.creditCardMetadata.installmentNumber}/${tx.creditCardMetadata.totalInstallments}`
        }

        return {
          account_id: connection.account_id,
          user_id: connection.user_id,
          description: desc,
          amount,
          category_id: categoryId,
          date: isoDate,
          paid_at: isoDate,
          pluggy_transaction_id: tx.id,
          ...(financialAccountId ? { financial_account_id: financialAccountId } : {}),
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    const { error: insertError } = await admin.from('expenses').insert(insertRows)
    if (insertError) {
      console.error('[pluggy/webhook] insert error:', insertError)
      return NextResponse.json({ error: 'Erro ao importar transações.' }, { status: 500 })
    }

    await admin.from('bank_connections').update({ last_synced_at: now.toISOString() }).eq('id', connection.id)

    console.log(`[pluggy/webhook] itemId=${itemId} imported=${insertRows.length}`)
    return NextResponse.json({ ok: true, imported: insertRows.length })

  } catch (err) {
    console.error('[pluggy/webhook]', err)
    return NextResponse.json({ error: 'Erro ao sincronizar.' }, { status: 502 })
  }
}
