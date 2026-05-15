import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/rateLimit'
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.itemId !== 'string' || !body.itemId.trim())
    return NextResponse.json({ error: 'itemId é obrigatório.' }, { status: 400 })

  const itemId = body.itemId.trim()
  const connectorName = typeof body.connectorName === 'string' ? body.connectorName.trim() : null
  const connectorLogo = typeof body.connectorLogo === 'string' ? body.connectorLogo.trim() : null

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, account_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  if (!checkRateLimit(`pluggy-sync:${user.id}`, 10, 60 * 60 * 1000))
    return NextResponse.json({ error: 'Muitas sincronizações. Tente novamente em 1 hora.' }, { status: 429 })

  if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) {
    console.error('[pluggy/sync] Missing PLUGGY credentials')
    return NextResponse.json({ error: 'Configuração de Open Finance incompleta.' }, { status: 500 })
  }

  const admin = createAdminClient()

  // Determine date range based on existing connection
  const { data: existingConn } = await admin
    .from('bank_connections')
    .select('id, last_synced_at')
    .eq('account_id', profile.account_id)
    .eq('item_id', itemId)
    .maybeSingle()

  const now = new Date()
  let fromDate: Date
  if (existingConn?.last_synced_at) {
    fromDate = new Date(existingConn.last_synced_at)
    fromDate.setDate(fromDate.getDate() - 7) // 7-day overlap for delayed transactions
  } else {
    fromDate = new Date(now)
    fromDate.setDate(fromDate.getDate() - 90)
  }
  const from = toISODate(fromDate)
  const to = toISODate(now)

  const upsertConnection = async () => {
    const { data: conn } = await admin
      .from('bank_connections')
      .upsert(
        {
          account_id: profile.account_id,
          user_id: profile.id,
          item_id: itemId,
          connector_name: connectorName,
          connector_logo: connectorLogo,
          last_synced_at: now.toISOString(),
        },
        { onConflict: 'account_id,item_id' }
      )
      .select()
      .single()
    return conn
  }

  try {
    const apiKey = await getPluggyApiKey()

    // Fetch bank accounts for this Pluggy item
    const accountsRes = await fetch(
      `${PLUGGY_BASE}/accounts?itemId=${encodeURIComponent(itemId)}`,
      { headers: { 'X-API-KEY': apiKey } }
    )
    if (!accountsRes.ok) throw new Error(`Pluggy /accounts: ${accountsRes.status}`)
    const { results: pluggyAccounts } = await accountsRes.json()

    // Fetch transactions for each bank account (DEBIT only)
    const allTransactions: PluggyTransaction[] = []
    for (const acct of (pluggyAccounts ?? []) as Array<{ id: string }>) {
      const txRes = await fetch(
        `${PLUGGY_BASE}/transactions?accountId=${encodeURIComponent(acct.id)}&from=${from}&to=${to}`,
        { headers: { 'X-API-KEY': apiKey } }
      )
      if (!txRes.ok) continue // skip failed accounts without aborting entire sync
      const { results } = await txRes.json()
      for (const tx of (results ?? []) as PluggyTransaction[]) {
        if (tx.type === 'DEBIT' && tx.amount !== 0) {
          allTransactions.push(tx)
        }
      }
      if (allTransactions.length >= MAX_ROWS) break
    }

    const transactions = allTransactions.slice(0, MAX_ROWS)

    if (transactions.length === 0) {
      const conn = await upsertConnection()
      return NextResponse.json({ imported: 0, connection: conn })
    }

    // Dedup: skip transactions already in the database
    const incomingIds = transactions.map(t => t.id)
    const { data: existingTxns } = await admin
      .from('expenses')
      .select('pluggy_transaction_id')
      .eq('account_id', profile.account_id)
      .in('pluggy_transaction_id', incomingIds)

    const alreadyImported = new Set(
      (existingTxns ?? []).map((r: { pluggy_transaction_id: string }) => r.pluggy_transaction_id)
    )
    const newTransactions = transactions.filter(t => !alreadyImported.has(t.id))

    if (newTransactions.length === 0) {
      const conn = await upsertConnection()
      return NextResponse.json({ imported: 0, connection: conn })
    }

    // Resolve or create financial account matching the connector name
    let financialAccountId: string | null = null
    if (connectorName) {
      const { data: existingFinAcct } = await admin
        .from('financial_accounts')
        .select('id')
        .eq('account_id', profile.account_id)
        .ilike('name', connectorName)
        .maybeSingle()

      if (existingFinAcct) {
        financialAccountId = existingFinAcct.id
      } else {
        const { data: created } = await admin
          .from('financial_accounts')
          .insert({ account_id: profile.account_id, name: connectorName })
          .select('id')
          .single()
        financialAccountId = created?.id ?? null
      }
    }

    // Build category lookup map
    const { data: categories } = await admin
      .from('categories')
      .select('id, name')
      .eq('account_id', profile.account_id)

    const catMap = new Map<string, string>()
    for (const c of (categories ?? [])) {
      catMap.set(c.name.toLowerCase(), c.id)
    }

    let othersCategoryId: string | null = catMap.get('outros') ?? null
    if (!othersCategoryId) {
      const { data: created } = await admin
        .from('categories')
        .insert({ account_id: profile.account_id, name: 'Outros', color: 'bg-gray-500' })
        .select('id')
        .single()
      othersCategoryId = created?.id ?? null
    }

    const DEFAULT_DESC = 'Transação bancária';

    // Build expense rows
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

        if (tx?.creditCardMetadata?.installmentNumber && tx?.creditCardMetadata?.totalInstallments && desc != DEFAULT_DESC) {
          desc = `${desc} ${tx.creditCardMetadata.installmentNumber}/${tx.creditCardMetadata.totalInstallments}`;
        }

        return {
          account_id: profile.account_id,
          user_id: profile.id,
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
      console.error('[pluggy/sync] insert error:', insertError)
      return NextResponse.json({ error: 'Erro ao importar transações.' }, { status: 500 })
    }

    const conn = await upsertConnection()
    return NextResponse.json({ imported: insertRows.length, connection: conn })

  } catch (err) {
    console.error('[pluggy/sync]', err)
    return NextResponse.json({ error: 'Erro ao sincronizar com Pluggy.' }, { status: 502 })
  }
}
