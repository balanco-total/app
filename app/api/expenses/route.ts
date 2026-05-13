import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isValidFieldText } from '@/utils/validation'
import { checkRateLimit } from '@/utils/rateLimit'

const MAX_DESCRIPTION = 60
const MAX_AMOUNT = 1_000_000

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const { description, amount, category_id, date, quantity: rawQty, paid: paidRaw } = body as Record<string, unknown>
  const wantPaid = !!paidRaw

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
  const minDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const maxDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

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
      return NextResponse.json({ error: 'Data fora do intervalo permitido (máx. 1 ano atrás e 1 ano à frente).' }, { status: 400 })
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
  const rows = installmentISOs.map(iso => ({
    account_id: profile.account_id,
    user_id: profile.id,
    description: String(description).trim(),
    amount,
    category_id,
    date: iso,
    paid_at: wantPaid && iso.slice(0, 7) <= currentYearMonth ? now.toISOString() : null,
  }))

  const { data, error } = await supabase
    .from('expenses')
    .insert(rows)
    .select('*, profiles(name)')

  if (error) return NextResponse.json({ error: 'Erro ao adicionar despesa.' }, { status: 500 })

  return NextResponse.json(data)
}
