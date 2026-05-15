import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/rateLimit'

const MAX_ROWS = 1000

type ImportRow = {
  description: string
  amount: number
  category_name: string
  date: string
  paid_at?: string
  account_name?: string
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.rows))
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const rows = body.rows as ImportRow[]

  if (rows.length === 0)
    return NextResponse.json({ error: 'Nenhum lançamento para importar.' }, { status: 400 })
  if (rows.length > MAX_ROWS)
    return NextResponse.json({ error: `Máximo de ${MAX_ROWS} lançamentos por importação.` }, { status: 400 })

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

  if (!checkRateLimit(`import:${user.id}`, 5, 60 * 60 * 1000))
    return NextResponse.json({ error: 'Muitas importações. Tente novamente em 1 hora.' }, { status: 429 })

  const [{ data: categories }, { data: financialAccounts }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('account_id', profile.account_id),
    supabase.from('financial_accounts').select('id, name').eq('account_id', profile.account_id),
  ])

  const catMap = new Map<string, string>()
  for (const c of (categories ?? [])) {
    catMap.set(c.name.toLowerCase(), c.id)
  }

  const accountMap = new Map<string, string>()
  for (const a of (financialAccounts ?? [])) {
    accountMap.set(a.name.toLowerCase(), a.id)
  }

  // Check if any row will need the fallback "Outros" category
  const needsOthers = rows.some(r => {
    const name = String(r.category_name ?? '').trim().toLowerCase()
    return !name || !catMap.has(name)
  })

  let othersCategoryId: string | null = null
  if (needsOthers) {
    const existing = catMap.get('outros')
    if (existing) {
      othersCategoryId = existing
    } else {
      const { data: created } = await supabase
        .from('categories')
        .insert({ account_id: profile.account_id, name: 'Outros', color: 'bg-gray-500' })
        .select('id')
        .single()
      othersCategoryId = created?.id ?? null
    }
  }

  const parseIsoDate = (str: string) => {
    const m = String(str ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return null
    const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
    if (d.getDate() !== parseInt(m[3])) return null
    return `${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`
  }

  const insertRows: object[] = []
  for (const row of rows) {
    const desc = String(row.description ?? '')
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60)
    if (!desc) continue

    const amount = Number(row.amount)
    if (!isFinite(amount) || amount <= 0) continue

    const isoDate = parseIsoDate(row.date)
    if (!isoDate) continue

    const isoPaidAt = row.paid_at ? (parseIsoDate(row.paid_at) ?? isoDate) : isoDate

    const catName = String(row.category_name ?? '').trim().toLowerCase()
    const categoryId = catName ? (catMap.get(catName) ?? othersCategoryId) : othersCategoryId

    const accountName = String(row.account_name ?? '').trim().toLowerCase()
    const financialAccountId = accountName ? (accountMap.get(accountName) ?? null) : null

    insertRows.push({
      account_id: profile.account_id,
      user_id: profile.id,
      description: desc,
      amount: Math.round(amount * 100) / 100,
      category_id: categoryId,
      date: isoDate,
      paid_at: isoPaidAt,
      ...(financialAccountId ? { financial_account_id: financialAccountId } : {}),
    })
  }

  if (insertRows.length === 0)
    return NextResponse.json({ error: 'Nenhum lançamento válido encontrado.' }, { status: 400 })

  const { error } = await supabase.from('expenses').insert(insertRows)
  if (error) return NextResponse.json({ error: 'Erro ao importar lançamentos.' }, { status: 500 })

  return NextResponse.json({ count: insertRows.length })
}
