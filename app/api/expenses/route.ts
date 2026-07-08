import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isValidFieldText } from '@/utils/validation'
import { checkRateLimit } from '@/utils/rateLimit'
import { invoiceCycleForDate, type InvoiceCycle } from '@/lib/credit-card'

const MAX_DESCRIPTION = 60
const MAX_AMOUNT = 1_000_000

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { description, amount, category_id, date, quantity: rawQty, paid: paidRaw, financial_account_id, credit_card_id } = body as Record<string, unknown>
  const wantPaid = !!paidRaw
  const isCard = !!credit_card_id

  if (!description || String(description).trim().length === 0)
    return NextResponse.json({ error: 'Descrição é obrigatória.' }, { status: 400 })
  if (String(description).trim().length > MAX_DESCRIPTION)
    return NextResponse.json({ error: `Descrição deve ter no máximo ${MAX_DESCRIPTION} caracteres.` }, { status: 400 })
  if (!isValidFieldText(String(description).trim()))
    return NextResponse.json({ error: 'Descrição contém caracteres inválidos.' }, { status: 400 })
  if (typeof amount !== 'number' || amount <= 0)
    return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 400 })
  if (amount > MAX_AMOUNT)
    return NextResponse.json({ error: 'Valor não pode ser maior que R$ 1.000.000,00.' }, { status: 400 })
  if (!category_id)
    return NextResponse.json({ error: 'Categoria é obrigatória.' }, { status: 400 })

  const qty = rawQty !== undefined ? Number(rawQty) : 1
  if (!Number.isInteger(qty) || qty < 1 || qty > 99)
    return NextResponse.json({ error: 'Quantidade deve ser entre 1 e 99.' }, { status: 400 })

  const now = new Date()
  const minDate = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate())
  const maxDate = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate())

  let startYear: number, startMonth: number, startDay: number
  const hasDate = date && typeof date === 'string'

  if (hasDate) {
    const match = (date as string).match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return NextResponse.json({ error: 'Formato de data inválido.' }, { status: 400 })
    startYear = parseInt(match[1])
    startMonth = parseInt(match[2])
    startDay = parseInt(match[3])
    const parsed = new Date(startYear, startMonth - 1, startDay)
    if (parsed.getDate() !== startDay || parsed.getMonth() !== startMonth - 1)
      return NextResponse.json({ error: 'Data inválida.' }, { status: 400 })
    if (parsed < minDate || parsed > maxDate)
      return NextResponse.json({ error: 'Data fora do intervalo permitido.' }, { status: 400 })
  } else {
    startYear = now.getFullYear()
    startMonth = now.getMonth() + 1
    startDay = now.getDate()
  }

  // Generate and validate all installment dates
  const installmentISOs: string[] = []
  for (let i = 0; i < qty; i++) {
    const d = new Date(startYear, startMonth - 1 + i, startDay)
    if (d.getDate() !== startDay) {
      const intendedIdx = (startMonth - 1 + i) % 12
      const intendedYear = startYear + Math.floor((startMonth - 1 + i) / 12)
      return NextResponse.json({
        error: `O dia ${startDay} não existe em ${MONTHS_PT[intendedIdx]} de ${intendedYear}.`,
      }, { status: 400 })
    }
    // Use noon UTC so the local date is correct across Brazilian timezones
    const y = String(d.getFullYear()).padStart(4, '0')
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    installmentISOs.push(hasDate || qty > 1 ? `${y}-${m}-${dd}T12:00:00.000Z` : now.toISOString())
  }

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

  if (!checkRateLimit(`expenses:${user.id}`, 60, 60 * 1000))
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }, { status: 429 })

  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // A lançamento targets EITHER a bank account OR a credit card, never both.
  if (isCard && financial_account_id)
    return NextResponse.json({ error: 'Selecione uma conta ou um cartão, não ambos.' }, { status: 400 })
  if (!isCard && (!financial_account_id || typeof financial_account_id !== 'string'))
    return NextResponse.json({ error: 'Conta é obrigatória.' }, { status: 400 })
  if (isCard && typeof credit_card_id !== 'string')
    return NextResponse.json({ error: 'Cartão inválido.' }, { status: 400 })

  type ExpenseInsert = {
    account_id: string
    user_id: string
    description: string
    amount: number
    category_id: unknown
    date: string
    paid_at: string | null
    financial_account_id: string | null
    credit_card_invoice_id?: string | null
  }

  let rows: ExpenseInsert[]

  if (isCard) {
    // Resolve the card's billing cycle for each installment and find-or-create
    // the matching monthly invoice. Card lançamentos never touch a bank balance:
    // financial_account_id and paid_at stay null.
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('id, closing_day, due_day')
      .eq('id', credit_card_id as string)
      .single()

    if (cardError || !card)
      return NextResponse.json({ error: 'Cartão não encontrado.' }, { status: 404 })

    const cycles = installmentISOs.map(iso => invoiceCycleForDate(iso, card.closing_day, card.due_day))

    const uniqueRefs = new Map<string, InvoiceCycle>()
    for (const c of cycles) if (!uniqueRefs.has(c.reference_month)) uniqueRefs.set(c.reference_month, c)
    const refMonths = Array.from(uniqueRefs.keys())

    const { data: existing } = await supabase
      .from('credit_card_invoices')
      .select('id, reference_month')
      .eq('credit_card_id', card.id)
      .in('reference_month', refMonths)

    const invoiceByRef = new Map<string, string>()
    for (const inv of existing ?? []) invoiceByRef.set(inv.reference_month, inv.id)

    const toCreate = refMonths
      .filter(r => !invoiceByRef.has(r))
      .map(r => {
        const c = uniqueRefs.get(r) as InvoiceCycle
        return {
          account_id: profile.account_id,
          credit_card_id: card.id,
          reference_month: r,
          closing_date: c.closing_date,
          due_date: c.due_date,
          status: 'open',
        }
      })

    if (toCreate.length > 0) {
      const { data: created, error: invError } = await supabase
        .from('credit_card_invoices')
        .insert(toCreate)
        .select('id, reference_month')
      if (invError) return NextResponse.json({ error: 'Erro ao criar fatura.' }, { status: 500 })
      for (const inv of created ?? []) invoiceByRef.set(inv.reference_month, inv.id)
    }

    rows = cycles.map((c, i) => ({
      account_id: profile.account_id,
      user_id: profile.id,
      description: String(description).trim(),
      amount,
      category_id,
      date: installmentISOs[i],
      paid_at: null,
      financial_account_id: null,
      credit_card_invoice_id: invoiceByRef.get(c.reference_month) as string,
    }))
  } else {
    rows = installmentISOs.map(iso => ({
      account_id: profile.account_id,
      user_id: profile.id,
      description: String(description).trim(),
      amount,
      category_id,
      date: iso,
      paid_at: wantPaid && iso.slice(0, 7) <= currentYearMonth ? now.toISOString() : null,
      financial_account_id: financial_account_id as string,
    }))
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert(rows)
    .select('*, profiles(name), credit_card_invoices(credit_card_id)')

  if (error) return NextResponse.json({ error: 'Erro ao adicionar despesa.' }, { status: 500 })

  return NextResponse.json(data)
}
