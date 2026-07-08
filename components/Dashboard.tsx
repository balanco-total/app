'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/utils/supabase/client'
import { ChevronRight, Circle, CheckCircle2 } from 'lucide-react'
import { useToast, Toasts, useConfirm, ConfirmModal } from './toast'
import BillingBanner from './BillingBanner'
import Button from './ui/Button'
import Modal from './ui/Modal'

// Sub-components
import DashboardHeader from './dashboard/DashboardHeader'
import CategorySummary from './dashboard/CategorySummary'

// Code-split: shipped as separate chunks to shrink the initial dashboard bundle.
// CategoryExpensesAside only renders on interaction, so it can skip SSR entirely.
const ExpenseForm = dynamic(() => import('./dashboard/ExpenseForm'))
const RecentExpenses = dynamic(() => import('./dashboard/RecentExpenses'))
const CategoryExpensesAside = dynamic(() => import('./charts/CategoryExpensesAside'), { ssr: false })

// Shared helpers
import {
  applyMask,
  parseMasked,
  parseDateDisplay,
  toLocalDateStr,
  toLocalDateDisplay,
  CATEGORY_COLORS,
  MONTHS_PT_LOWER,
} from './dashboard/helpers'

// Types
import type {
  Profile,
  Account,
  Category,
  Expense,
  FinancialAccount,
  CreditCardOption,
  EditingExpenseState,
  PendingCategoryChange,
  PendingPaidToggle,
  User,
  RecurringExpense,
  VirtualExpense,
} from './dashboard/types'
import { parseSource } from './dashboard/AccountSelect'

// Recurring helpers
import { generateVirtualOccurrences } from '@/lib/recurring'

import type { AsideExpense } from './charts/CategoryExpensesAside'

// ─────────────────────────────────────────────
// Monthly summary helpers
// ─────────────────────────────────────────────

type MonthExpenseRow = {
  category_id: string | null
  amount: number
  paid_at: string | null
  credit_card_invoice_id?: string | null
  recurring_expense_id?: string | null
  occurrence_year_month?: string | null
  skipped?: boolean
}

/** Combines real month expenses with virtual recurring occurrences for the summary totals. */
function buildMonthlyData(
  monthExpenses: MonthExpenseRow[],
  templates: RecurringExpense[],
  month: string,
): MonthExpenseRow[] {
  const materializedKeys = new Set(
    monthExpenses
      .filter(e => e.recurring_expense_id && e.occurrence_year_month)
      .map(e => `${e.recurring_expense_id}:${e.occurrence_year_month}`)
  )
  const virtualData = generateVirtualOccurrences(templates, month, materializedKeys).map(v => ({
    category_id: v.category_id,
    amount: v.amount,
    paid_at: null,
    credit_card_invoice_id: null,
    recurring_expense_id: v.recurring_expense_id,
    occurrence_year_month: v.occurrence_year_month,
    skipped: false,
  }))
  return [...monthExpenses.filter(e => !e.skipped), ...virtualData]
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────

export default function Dashboard({
  user,
  profile,
  account,
  initialCategories,
  initialExpenses,
  initialFinancialAccounts,
  initialCreditCards,
  initialRecurring,
  initialMonthExpenses,
  initialMonth,
}: {
  user: User
  profile: Profile
  account: Account
  initialCategories: Category[]
  initialExpenses: Expense[]
  initialFinancialAccounts: FinancialAccount[]
  initialCreditCards: CreditCardOption[]
  initialRecurring: RecurringExpense[]
  initialMonthExpenses: MonthExpenseRow[]
  initialMonth: string
}) {
  const supabase = createClient()

  // ── Core data ──────────────────────────────
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [financialAccounts] = useState<FinancialAccount[]>(initialFinancialAccounts)
  const [creditCards] = useState<CreditCardOption[]>(initialCreditCards)
  const [monthlyData, setMonthlyData] = useState<MonthExpenseRow[]>(
    () => buildMonthlyData(initialMonthExpenses, initialRecurring, initialMonth)
  )

  // Default expense source: the default bank account, else first bank, else first card.
  const defaultSource = (() => {
    const bank = initialFinancialAccounts.find(a => a.is_default) ?? initialFinancialAccounts[0]
    if (bank) return `bank:${bank.id}`
    if (initialCreditCards[0]) return `card:${initialCreditCards[0].id}`
    return ''
  })()

  // ── Form state ─────────────────────────────
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => toLocalDateDisplay(new Date()))
  const [quantity, setQuantity] = useState('1')
  const [paid, setPaid] = useState(false)
  const [selectedSource, setSelectedSource] = useState<string>(defaultSource)
  const [isRecurring, setIsRecurring] = useState(false)

  // ── Month navigation ───────────────────────
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)

  // ── Modals ─────────────────────────────────
  const [pendingCategoryChange, setPendingCategoryChange] = useState<PendingCategoryChange | null>(null)
  const [pendingPaidToggle, setPendingPaidToggle] = useState<PendingPaidToggle | null>(null)
  const [editingExpense, setEditingExpense] = useState<EditingExpenseState | null>(null)

  // ── Category aside ─────────────────────────
  const [asideCategory, setAsideCategory] = useState<{ id: string; name: string } | null>(null)
  const [asideExpenses, setAsideExpenses] = useState<((Expense | VirtualExpense) & { categoryName?: string | null; categoryColor?: string | null })[]>([])
  const [asideLoading, setAsideLoading] = useState(false)

  const { toasts, toast, dismiss } = useToast()
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()
  const isFirstMonthEffect = useRef(true)

  // ── Data fetching ──────────────────────────

  const recurringTemplatesRef = useRef<RecurringExpense[]>(initialRecurring)

  const fetchMonthlySummary = useCallback(async (month: string) => {
    const [y, m] = month.split('-').map(Number)
    const nextMonth = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('expenses')
      .select('category_id, amount, paid_at, credit_card_invoice_id, recurring_expense_id, occurrence_year_month, skipped')
      .eq('account_id', profile.account_id)
      .gte('date', `${month}-01`)
      .lt('date', nextMonth)
    setMonthlyData(buildMonthlyData((data ?? []) as MonthExpenseRow[], recurringTemplatesRef.current, month))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.account_id])

  // Initial month summary is computed server-side and passed in; only refetch on month change.
  useEffect(() => {
    if (isFirstMonthEffect.current) {
      isFirstMonthEffect.current = false
      return
    }
    fetchMonthlySummary(selectedMonth)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  // ── Handlers ───────────────────────────────

  const shiftMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const openCategoryAside = async (cat: { id: string; name: string }) => {
    if (asideCategory?.id === cat.id) { setAsideCategory(null); return }
    setAsideCategory(cat)
    setAsideExpenses([])
    setAsideLoading(true)
    const [y, m] = selectedMonth.split('-').map(Number)
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('expenses')
      .select('id, description, amount, date, category_id, paid_at, user_id, financial_account_id, credit_card_invoice_id, credit_card_invoices(credit_card_id), recurring_expense_id, occurrence_year_month, skipped, profiles(name)')
      .eq('account_id', profile.account_id)
      .eq('category_id', cat.id)
      .gte('date', `${selectedMonth}-01`)
      .lt('date', nextMonth)
    const real = ((data ?? []) as unknown as Expense[]).filter(e => !e.skipped)
    const materializedKeys = new Set(
      real.filter(e => e.recurring_expense_id && e.occurrence_year_month)
          .map(e => `${e.recurring_expense_id}:${e.occurrence_year_month}`)
    )
    const virtuals = generateVirtualOccurrences(recurringTemplatesRef.current, selectedMonth, materializedKeys)
      .filter(v => v.category_id === cat.id)
    setAsideExpenses([...virtuals, ...real])
    setAsideLoading(false)
  }

  const withCategory = <T extends { category_id: string | null }>(exp: T) => {
    const c = exp.category_id ? categoryMap.get(exp.category_id) : undefined
    return { ...exp, categoryName: c?.name ?? null, categoryColor: c?.color ?? null }
  }

  const openUnpaidAside = async () => {
    const unpaidCategory = { id: '__unpaid__', name: 'Não pagos' }
    if (asideCategory?.id === '__unpaid__') { setAsideCategory(null); return }
    setAsideCategory(unpaidCategory)
    setAsideExpenses([])
    setAsideLoading(true)
    const [y, m] = selectedMonth.split('-').map(Number)
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('expenses')
      .select('id, description, amount, date, category_id, paid_at, user_id, financial_account_id, credit_card_invoice_id, credit_card_invoices(credit_card_id), recurring_expense_id, occurrence_year_month, skipped, profiles(name)')
      .eq('account_id', profile.account_id)
      .gte('date', `${selectedMonth}-01`)
      .lt('date', nextMonth)
    const real = ((data ?? []) as unknown as Expense[]).filter(e => !e.skipped)
    const materializedKeys = new Set(
      real.filter(e => e.recurring_expense_id && e.occurrence_year_month)
          .map(e => `${e.recurring_expense_id}:${e.occurrence_year_month}`)
    )
    const virtuals = generateVirtualOccurrences(recurringTemplatesRef.current, selectedMonth, materializedKeys)
    const realUnpaid = real.filter(e => !e.paid_at && !e.credit_card_invoice_id)
    setAsideExpenses([...virtuals, ...realUnpaid].map(withCategory))
    setAsideLoading(false)
  }

  const addExpense = async () => {
    if (!description.trim()) { toast.error('Descrição é obrigatória.'); return }
    const parsedAmount = parseMasked(amount)
    if (parsedAmount <= 0) { toast.error('Valor deve ser maior que zero.'); return }
    if (!selectedCategory) { toast.error('Selecione uma categoria.'); return }
    const { kind: sourceKind, id: sourceId } = parseSource(selectedSource)
    const isCard = sourceKind === 'card'
    if ((financialAccounts.length > 0 || creditCards.length > 0) && !sourceId) {
      toast.error('Selecione uma conta ou cartão.'); return
    }

    const today = new Date()
    const todayInternal = toLocalDateStr(today)
    const internalDate = parseDateDisplay(expenseDate)

    if (!internalDate) { toast.error('Data inválida.'); return }

    if (internalDate !== todayInternal) {
      const [y, m, d] = internalDate.split('-').map(Number)
      const parsed = new Date(y, m - 1, d)
      const minDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
      const maxDate = new Date(today.getFullYear() + 10, today.getMonth(), today.getDate())
      if (parsed < minDate || parsed > maxDate) { toast.error('Data fora do intervalo permitido.'); return }
    }

    const qty = Math.max(1, Math.min(99, parseInt(quantity, 10) || 1))
    const dateStr = internalDate

    if (qty > 1) {
      const [y, m, d] = dateStr.split('-').map(Number)
      for (let i = 1; i < qty; i++) {
        const check = new Date(y, m - 1 + i, d)
        if (check.getDate() !== d) {
          const idx = (m - 1 + i) % 12
          const yr = y + Math.floor((m - 1 + i) / 12)
          toast.error(`O dia ${d} não existe em ${MONTHS_PT_LOWER[idx]} de ${yr}. As parcelas não podem ser criadas.`)
          return
        }
      }
    }

    if (isRecurring && !isCard) {
      const [ry, rm, rd] = (parseDateDisplay(expenseDate) || toLocalDateStr(new Date())).split('-').map(Number)
      const startYm = `${ry}-${String(rm).padStart(2, '0')}`
      const res = await fetch('/api/recurring/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: parsedAmount,
          category_id: selectedCategory,
          financial_account_id: sourceId,
          day_of_month: rd,
          start_year_month: startYm,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao criar despesa recorrente.'); return }
      const newTemplate = json as RecurringExpense
      recurringTemplatesRef.current = [...recurringTemplatesRef.current, newTemplate]
      fetchMonthlySummary(selectedMonth)
      toast.success?.('Despesa recorrente criada!')
    } else {
      const body: Record<string, unknown> = {
        description,
        amount: parsedAmount,
        category_id: selectedCategory,
      }
      if (internalDate !== todayInternal) body.date = internalDate
      if (qty > 1) body.quantity = qty
      if (isCard) {
        body.credit_card_id = sourceId
      } else {
        if (paid) body.paid = true
        if (sourceId) body.financial_account_id = sourceId
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao adicionar despesa.'); return }

      const created: Expense[] = Array.isArray(json) ? json : [json]
      setExpenses([...created, ...expenses])
      fetchMonthlySummary(selectedMonth)
    }

    // Reset form
    setDescription('')
    setAmount('')
    setSelectedCategory('')
    setExpenseDate(toLocalDateDisplay(new Date()))
    setQuantity('1')
    setPaid(false)
    setIsRecurring(false)
    setSelectedSource(defaultSource)
  }

  const deleteExpense = (expenseId: string) => {
    showConfirm({
      title: 'Excluir lançamento?',
      body: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
        if (error) { toast.error('Erro ao excluir despesa.'); return }
        setExpenses(prev => prev.filter(e => e.id !== expenseId))
        setAsideExpenses(prev => prev.filter(e => e.id !== expenseId))
        setEditingExpense(prev => prev?.expense.id === expenseId ? null : prev)
        fetchMonthlySummary(selectedMonth)
      },
    })
  }

  const togglePaid = (exp: Expense | VirtualExpense) => {
    // Card lançamentos have no individual paid state — payment happens at the invoice level.
    if ((exp as Expense).credit_card_invoice_id) return
    if ((exp as VirtualExpense)._virtual === true) {
      setPendingPaidToggle({
        expense: exp,
        amountDisplay: exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        financialAccountId: exp.financial_account_id ?? '',
      })
      return
    }
    if (!exp.paid_at) {
      setPendingPaidToggle({
        expense: exp,
        amountDisplay: exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        financialAccountId: exp.financial_account_id ?? '',
      })
    } else {
      showConfirm({
        title: 'Desmarcar pagamento?',
        body: exp.description,
        confirmLabel: 'Desmarcar',
        onConfirm: async () => {
          const { error } = await supabase.from('expenses').update({ paid_at: null }).eq('id', exp.id)
          if (error) { toast.error('Erro ao atualizar pagamento.'); return }
          setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, paid_at: null } : e))
          setAsideExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, paid_at: null } : e))
          fetchMonthlySummary(selectedMonth)
        },
      })
    }
  }

  const openEditModal = (exp: Expense) => {
    const parts = exp.date.slice(0, 10).split('-')
    const cardId = exp.credit_card_invoices?.credit_card_id
    setEditingExpense({
      expense: exp,
      description: exp.description,
      amountDisplay: exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      categoryId: exp.category_id ?? '',
      dateDisplay: `${parts[2]}/${parts[1]}/${parts[0]}`,
      paid: !!exp.paid_at,
      financialAccountId: exp.financial_account_id ?? '',
      isCard: !!exp.credit_card_invoice_id,
      cardName: cardId ? cardMap.get(cardId)?.description : undefined,
    })
  }

  const saveEditedExpense = async () => {
    if (!editingExpense) return
    const { expense: exp } = editingExpense

    if (!editingExpense.description.trim()) { toast.error('Descrição é obrigatória.'); return }
    const parsedAmount = parseMasked(editingExpense.amountDisplay)
    if (parsedAmount <= 0) { toast.error('Valor deve ser maior que zero.'); return }
    if (parsedAmount > 1_000_000) { toast.error('Valor excede o limite de R$ 1.000.000,00.'); return }
    if (!editingExpense.categoryId) { toast.error('Selecione uma categoria.'); return }

    const internalDate = parseDateDisplay(editingExpense.dateDisplay)
    if (!internalDate) { toast.error('Data inválida.'); return }

    const today = new Date()
    const [ey, em, ed] = internalDate.split('-').map(Number)
    const parsedDate = new Date(ey, em - 1, ed)
    const minDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
    const maxDate = new Date(today.getFullYear() + 10, today.getMonth(), today.getDate())
    if (parsedDate < minDate || parsedDate > maxDate) { toast.error('Data fora do intervalo permitido.'); return }
    if (!editingExpense.isCard && financialAccounts.length > 0 && !editingExpense.financialAccountId) { toast.error('Selecione uma conta.'); return }

    const updates: Record<string, unknown> = {
      description: editingExpense.description.trim(),
      amount: parsedAmount,
      category_id: editingExpense.categoryId || null,
      date: internalDate,
    }

    // Card lançamentos keep credit_card_invoice_id and never touch a bank account
    // or paid_at — those concepts live on the invoice, not the lançamento.
    if (!editingExpense.isCard) {
      updates.financial_account_id = editingExpense.financialAccountId || null
      if (editingExpense.paid && !exp.paid_at) updates.paid_at = new Date().toISOString()
      else if (!editingExpense.paid && exp.paid_at) updates.paid_at = null
    }

    const { error } = await supabase.from('expenses').update(updates).eq('id', exp.id)
    if (error) { toast.error('Erro ao atualizar lançamento.'); return }

    const editedFields = {
      description: updates.description as string,
      amount: updates.amount as number,
      category_id: updates.category_id as string | null,
      date: updates.date as string,
      ...(editingExpense.isCard ? {} : { financial_account_id: updates.financial_account_id as string | null }),
      paid_at: 'paid_at' in updates ? (updates.paid_at as string | null) : exp.paid_at,
    }
    setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, ...editedFields } : e))
    setAsideExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, ...editedFields } : e))
    fetchMonthlySummary(selectedMonth)
    setEditingExpense(null)
  }

  const updateExpenseCategory = async (expenseId: string, newCategoryId: string | null) => {
    const original = expenses.find(e => e.id === expenseId)?.category_id ?? null
    setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, category_id: newCategoryId } : e))
    const { error } = await supabase.from('expenses').update({ category_id: newCategoryId }).eq('id', expenseId)
    if (error) {
      setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, category_id: original } : e))
      toast.error('Erro ao atualizar categoria.')
    } else {
      fetchMonthlySummary(selectedMonth)
    }
  }

  const addCategory = async (name: string) => {
    if (name.length < 3) { toast.error('O nome da categoria deve ter pelo menos 3 caracteres.'); return }
    const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Erro ao adicionar categoria.'); return }
    setCategories([...categories, json])
    setSelectedCategory(json.id)
  }

  const deleteCategory = (cat: Category) => {
    showConfirm({
      title: `Excluir categoria "${cat.name}"?`,
      body: 'As despesas associadas ficarão sem categoria.',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        const { error } = await supabase.from('categories').delete().eq('id', cat.id)
        if (error) { toast.error('Erro ao excluir categoria.'); return }
        setCategories(prev => prev.filter(c => c.id !== cat.id))
        if (selectedCategory === cat.id) setSelectedCategory('')
      },
    })
  }

  // ── Virtual expense handlers ───────────────

  const handleMaterializePaid = async (
    recurringExpenseId: string,
    yearMonth: string,
    amountOverride?: number,
    financialAccountId?: string,
  ): Promise<boolean> => {
    const res = await fetch('/api/recurring/materialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recurring_expense_id: recurringExpenseId,
        occurrence_year_month: yearMonth,
        action: 'pay',
        ...(amountOverride ? { amount_override: amountOverride } : {}),
        ...(financialAccountId !== undefined ? { financial_account_id: financialAccountId || null } : {}),
      }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Erro ao marcar pagamento.'); return false }
    const materialized = json as Expense
    setExpenses(prev => [materialized, ...prev])
    setAsideExpenses(prev => [
      materialized,
      ...prev.filter(e => !(e as VirtualExpense)._virtual || (e as VirtualExpense).recurring_expense_id !== recurringExpenseId || (e as VirtualExpense).occurrence_year_month !== yearMonth),
    ])
    fetchMonthlySummary(selectedMonth)
    return true
  }

  const handleEndRecurrence = async (recurringExpenseId: string, yearMonth: string) => {
    const [y, m] = yearMonth.split('-').map(Number)
    const prevMonth = m === 1
      ? `${y - 1}-12`
      : `${y}-${String(m - 1).padStart(2, '0')}`
    const res = await fetch('/api/recurring/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recurring_expense_id: recurringExpenseId, end_year_month: prevMonth }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Erro ao encerrar recorrência.'); return }
    const updated = json as RecurringExpense
    recurringTemplatesRef.current = recurringTemplatesRef.current.map(t => t.id === updated.id ? updated : t)
    // Remove the virtual occurrence from aside and refresh summary
    setAsideExpenses(prev => prev.filter(e => !(e as VirtualExpense)._virtual || (e as VirtualExpense).recurring_expense_id !== recurringExpenseId))
    fetchMonthlySummary(selectedMonth)
  }

  const handleMaterializeEdit = async (
    recurringExpenseId: string,
    yearMonth: string,
    amount: number,
    scope: 'month' | 'future'
  ) => {
    if (scope === 'future') {
      const res = await fetch('/api/recurring/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurring_expense_id: recurringExpenseId, amount }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao atualizar recorrência.'); return }
      const updated = json as RecurringExpense
      recurringTemplatesRef.current = recurringTemplatesRef.current.map(t => t.id === updated.id ? updated : t)
      // Refresh aside — virtual amounts changed
      setAsideExpenses(prev => prev.map(e =>
        (e as VirtualExpense)._virtual && (e as VirtualExpense).recurring_expense_id === recurringExpenseId
          ? { ...e, amount }
          : e
      ))
      fetchMonthlySummary(selectedMonth)
    } else {
      const res = await fetch('/api/recurring/materialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurring_expense_id: recurringExpenseId, occurrence_year_month: yearMonth, action: 'edit', amount_override: amount }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao editar ocorrência.'); return }
      const materialized = json as Expense
      setExpenses(prev => [materialized, ...prev])
      setAsideExpenses(prev => [
        materialized,
        ...prev.filter(e => !(e as VirtualExpense)._virtual || (e as VirtualExpense).recurring_expense_id !== recurringExpenseId || (e as VirtualExpense).occurrence_year_month !== yearMonth),
      ])
      fetchMonthlySummary(selectedMonth)
    }
  }

  // ── Derived state ──────────────────────────

  const categoryMap = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  )

  const cardMap = useMemo(
    () => new Map(creditCards.map(c => [c.id, c])),
    [creditCards],
  )

  const expenseMap = useMemo(
    () => new Map(expenses.map(e => [e.id, e])),
    [expenses],
  )

  const categorySummary = useMemo(() => {
    const totalsByCategory = new Map<string, number>()
    for (const e of monthlyData) {
      if (!e.category_id) continue
      totalsByCategory.set(e.category_id, (totalsByCategory.get(e.category_id) ?? 0) + e.amount)
    }
    return categories
      .map(cat => ({ ...cat, total: totalsByCategory.get(cat.id) ?? 0 }))
      .sort((a, b) => b.total - a.total)
  }, [categories, monthlyData])

  const { totalMonth, totalUnpaid } = useMemo(() => {
    let total = 0
    let unpaid = 0
    for (const e of monthlyData) {
      total += e.amount
      // Card lançamentos count toward the month total but are not "unpaid bills".
      if (!e.paid_at && !e.credit_card_invoice_id) unpaid += e.amount
    }
    return { totalMonth: total, totalUnpaid: unpaid }
  }, [monthlyData])

  // ── Render ─────────────────────────────────

  return (
    <div className="min-h-screen bg-white dark:bg-dm-surface p-4">
      <div className="max-w-7xl mx-auto">

        <DashboardHeader profile={profile} />

        {account && (
          <BillingBanner
            subscriptionStatus={account.subscription_status}
            trialEndsAt={account.trial_ends_at}
            isOwner={profile.role === 'owner'}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <ExpenseForm
            categories={categories}
            financialAccounts={financialAccounts}
            creditCards={creditCards}
            description={description}
            setDescription={setDescription}
            amount={amount}
            setAmount={setAmount}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            expenseDate={expenseDate}
            setExpenseDate={setExpenseDate}
            quantity={quantity}
            setQuantity={setQuantity}
            paid={paid}
            setPaid={setPaid}
            selectedSource={selectedSource}
            setSelectedSource={setSelectedSource}
            isRecurring={isRecurring}
            setIsRecurring={setIsRecurring}
            onAdd={addExpense}
            onDeleteCategory={deleteCategory}
            onAddCategory={addCategory}
          />

          <CategorySummary
            categorySummary={categorySummary}
            totalMonth={totalMonth}
            totalUnpaid={totalUnpaid}
            selectedMonth={selectedMonth}
            onShiftMonth={shiftMonth}
            onCategoryClick={openCategoryAside}
            onUnpaidClick={openUnpaidAside}
          />
        </div>

        <RecentExpenses
          expenses={expenses}
          categories={categories}
          financialAccounts={financialAccounts}
          creditCards={creditCards}
          user={user}
          onTogglePaid={togglePaid}
          onDelete={deleteExpense}
          onEdit={openEditModal}
          onCategoryChange={change => setPendingCategoryChange(change)}
        />
      </div>

      {/* ── Modal: Confirm category change ────────── */}
      {pendingCategoryChange && (() => {
        const exp = expenseMap.get(pendingCategoryChange.expenseId)
        const from = exp?.category_id ? categoryMap.get(exp.category_id) : undefined
        const to = pendingCategoryChange.newCategoryId
          ? categoryMap.get(pendingCategoryChange.newCategoryId)
          : undefined
        return (
          <Modal open={true} onClose={() => setPendingCategoryChange(null)} size="sm">
            <h3 className="text-lg font-bold text-gray-800 dark:text-dm-text mb-1">Alterar categoria</h3>
            <p className="text-sm text-gray-500 dark:text-dm-muted mb-4 truncate">{exp?.description}</p>
            <div className="flex items-center gap-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${from?.color ?? 'bg-gray-400'} text-white`}>
                {from?.name ?? 'Sem categoria'}
              </span>
              <ChevronRight size={16} className="text-gray-400 dark:text-dm-faint shrink-0" />
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${to?.color ?? 'bg-gray-400'} text-white`}>
                {to?.name ?? 'Sem categoria'}
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                size="md"
                onClick={() => {
                  updateExpenseCategory(pendingCategoryChange.expenseId, pendingCategoryChange.newCategoryId)
                  setPendingCategoryChange(null)
                }}
                className="flex-1"
              >
                Confirmar
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setPendingCategoryChange(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </Modal>
        )
      })()}

      {/* ── Modal: Mark as paid ───────────────────── */}
      {pendingPaidToggle && (() => {
        const { expense: exp, amountDisplay, financialAccountId } = pendingPaidToggle
        const newAmount = parseMasked(amountDisplay)
        const isValid = newAmount > 0 && newAmount <= 1_000_000
        const amountChanged = isValid && newAmount !== exp.amount
        const accountChanged = financialAccountId !== (exp.financial_account_id ?? '')
        return (
          <Modal open={true} onClose={() => setPendingPaidToggle(null)} size="sm">
            <h3 className="text-lg font-bold text-gray-800 dark:text-dm-text mb-1">Marcar como pago?</h3>
            <p className="text-sm text-gray-500 dark:text-dm-muted mb-4 truncate">{exp.description}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Valor (R$)</label>
              <input
                type="text"
                inputMode="numeric"
                value={amountDisplay}
                onChange={e => setPendingPaidToggle(prev => prev ? { ...prev, amountDisplay: applyMask(e.target.value) } : null)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-dm-field dark:text-dm-text dark:border-white/[0.14] ${!isValid && amountDisplay ? 'border-red-400' : 'border-gray-300'}`}
              />
              {!isValid && amountDisplay && <p className="text-xs text-red-500 mt-1">Valor inválido.</p>}
            </div>
            {financialAccounts.length > 0 && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Conta</label>
                <select
                  value={financialAccountId}
                  onChange={e => setPendingPaidToggle(prev => prev ? { ...prev, financialAccountId: e.target.value } : null)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm dark:bg-dm-field dark:text-dm-text dark:border-white/[0.14] ${!financialAccountId ? 'text-gray-400' : 'text-gray-700'} border-gray-300`}
                >
                  <option value="">Selecione uma conta</option>
                  {financialAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}{acc.is_default ? ' (padrão)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="destructive"
                size="md"
                disabled={!isValid}
                onClick={async () => {
                  if (!isValid) return
                  if (financialAccounts.length > 0 && !financialAccountId) { toast.error('Selecione uma conta.'); return }
                  if ('_virtual' in exp) {
                    const ok = await handleMaterializePaid(
                      exp.recurring_expense_id,
                      exp.occurrence_year_month,
                      amountChanged ? newAmount : undefined,
                      financialAccountId,
                    )
                    if (ok) setPendingPaidToggle(null)
                    return
                  }
                  const now = new Date().toISOString()
                  const updates: Record<string, unknown> = { paid_at: now }
                  if (amountChanged) updates.amount = newAmount
                  if (accountChanged) updates.financial_account_id = financialAccountId || null
                  const { error } = await supabase.from('expenses').update(updates).eq('id', exp.id)
                  if (error) { toast.error('Erro ao atualizar lançamento.'); return }
                  const updatedFields = {
                    paid_at: now,
                    ...(amountChanged ? { amount: newAmount } : {}),
                    ...(accountChanged ? { financial_account_id: financialAccountId || null } : {}),
                  }
                  setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, ...updatedFields } : e))
                  setAsideExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, ...updatedFields } : e))
                  fetchMonthlySummary(selectedMonth)
                  setPendingPaidToggle(null)
                }}
                className="flex-1"
              >
                {amountChanged ? 'Editar e pagar' : 'Marcar pago'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setPendingPaidToggle(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </Modal>
        )
      })()}

      {/* ── Modal: Edit expense ───────────────────── */}
      {editingExpense && (() => {
        const { description: editDesc, amountDisplay, categoryId, dateDisplay, paid: editPaid, financialAccountId, isCard: editIsCard, cardName: editCardName } = editingExpense
        const parsedAmount = parseMasked(amountDisplay)
        const amountValid = parsedAmount > 0 && parsedAmount <= 1_000_000
        const showDateError = dateDisplay !== '' && parseDateDisplay(dateDisplay) === ''

        return (
          <Modal
            open={true}
            onClose={() => setEditingExpense(null)}
            size="sm"
            title="Editar"
            showClose
          >
            <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Descrição</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={editDesc}
                    onChange={e => setEditingExpense(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/[0.14] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm dark:bg-dm-field dark:text-dm-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountDisplay}
                    onChange={e => setEditingExpense(prev => prev ? { ...prev, amountDisplay: applyMask(e.target.value) } : null)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm dark:bg-dm-field dark:text-dm-text dark:border-white/[0.14] ${!amountValid && amountDisplay ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {!amountValid && amountDisplay && <p className="text-xs text-red-500 mt-1">Valor inválido.</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={e => setEditingExpense(prev => prev ? { ...prev, categoryId: e.target.value } : null)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/[0.14] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-700 dark:bg-dm-field dark:text-dm-text"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Data</label>
                  <input
                    type="date"
                    value={parseDateDisplay(dateDisplay) || ''}
                    onChange={e => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-')
                        setEditingExpense(prev => prev ? { ...prev, dateDisplay: `${d}/${m}/${y}` } : null)
                      } else {
                        setEditingExpense(prev => prev ? { ...prev, dateDisplay: '' } : null)
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm dark:bg-dm-field dark:text-dm-text dark:border-white/[0.14] ${showDateError ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {showDateError && <p className="text-xs text-red-500 mt-1">Data inválida.</p>}
                </div>

                {!editIsCard && (
                  <div className="flex items-center justify-between py-0.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-dm-muted">Pago</label>
                    <button
                      type="button"
                      onClick={() => setEditingExpense(prev => prev ? { ...prev, paid: !prev.paid } : null)}
                      className={`flex items-center gap-1.5 text-sm font-medium transition ${editPaid ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {editPaid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      <span>{editPaid ? 'Sim' : 'Não'}</span>
                    </button>
                  </div>
                )}

                {editIsCard ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Cartão</label>
                    <p className="text-sm text-gray-700 dark:text-dm-text">{editCardName ?? 'Cartão de crédito'}</p>
                  </div>
                ) : financialAccounts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Conta</label>
                    <select
                      value={financialAccountId}
                      onChange={e => setEditingExpense(prev => prev ? { ...prev, financialAccountId: e.target.value } : null)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-white/[0.14] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-700 dark:bg-dm-field dark:text-dm-text"
                    >
                      <option value="">Selecione uma conta</option>
                      {financialAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}{acc.is_default ? ' (padrão)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => deleteExpense(editingExpense.expense.id)}
                className="text-sm font-medium text-red-600 hover:text-red-700 transition"
              >
                Excluir
              </button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setEditingExpense(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="md"
                  onClick={saveEditedExpense}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </Modal>
        )
      })()}

      <ConfirmModal {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
      <Toasts toasts={toasts} dismiss={dismiss} />

      <CategoryExpensesAside
        category={asideCategory}
        expenses={asideExpenses as AsideExpense[]}
        onClose={() => setAsideCategory(null)}
        selectedMonth={selectedMonth}
        loading={asideLoading}
        onTogglePaid={(exp) => togglePaid(exp as unknown as Expense | VirtualExpense)}
        onEdit={(exp) => openEditModal(exp as unknown as Expense)}
        onEndRecurrence={handleEndRecurrence}
        onMaterializeEdit={handleMaterializeEdit}
      />
    </div>
  )
}