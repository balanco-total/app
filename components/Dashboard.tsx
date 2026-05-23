'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ChevronRight, Circle, CheckCircle2 } from 'lucide-react'
import { useToast, Toasts, useConfirm, ConfirmModal } from './toast'
import LoadingPage from './LoadingPage'
import BillingBanner from './BillingBanner'
import Button from './ui/Button'
import Modal from './ui/Modal'

// Sub-components
import DashboardHeader from './dashboard/DashboardHeader'
import ExpenseForm from './dashboard/ExpenseForm'
import CategorySummary from './dashboard/CategorySummary'
import RecentExpenses from './dashboard/RecentExpenses'
import CategoryExpensesAside from './charts/CategoryExpensesAside'

// Shared helpers
import {
  applyMask,
  parseMasked,
  parseDateDisplay,
  toLocalDateStr,
  toLocalDateDisplay,
  DEFAULT_CATEGORIES,
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
  EditingExpenseState,
  PendingCategoryChange,
  PendingPaidToggle,
  User,
} from './dashboard/types'

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────

export default function Dashboard({
  user,
  profile,
  account,
}: {
  user: User
  profile: Profile
  account: Account
}) {
  const supabase = createClient()

  // ── Core data ──────────────────────────────
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([])
  const [monthlyData, setMonthlyData] = useState<{ category_id: string | null; amount: number; paid_at: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  // ── Form state ─────────────────────────────
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => toLocalDateDisplay(new Date()))
  const [quantity, setQuantity] = useState('1')
  const [paid, setPaid] = useState(false)
  const [selectedFinancialAccount, setSelectedFinancialAccount] = useState<string>('')

  // ── Month navigation ───────────────────────
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  // ── Modals ─────────────────────────────────
  const [pendingCategoryChange, setPendingCategoryChange] = useState<PendingCategoryChange | null>(null)
  const [pendingPaidToggle, setPendingPaidToggle] = useState<PendingPaidToggle | null>(null)
  const [editingExpense, setEditingExpense] = useState<EditingExpenseState | null>(null)

  // ── Category aside ─────────────────────────
  const [asideCategory, setAsideCategory] = useState<{ id: string; name: string } | null>(null)
  const [asideExpenses, setAsideExpenses] = useState<Expense[]>([])
  const [asideLoading, setAsideLoading] = useState(false)

  const { toasts, toast, dismiss } = useToast()
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()
  const hasLoadedRef = useRef(false)

  // ── Data fetching ──────────────────────────

  const fetchMonthlySummary = useCallback(async (month: string) => {
    const [y, m] = month.split('-').map(Number)
    const nextMonth = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('expenses')
      .select('category_id, amount, paid_at')
      .eq('account_id', profile.account_id)
      .gte('date', `${month}-01`)
      .lt('date', nextMonth)
    setMonthlyData(data ?? [])
  }, [profile.account_id])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!hasLoadedRef.current) return
    fetchMonthlySummary(selectedMonth)
  }, [selectedMonth])

  const loadData = async () => {
    const [categoriesRes, expensesRes, finAccountsRes] = await Promise.all([
      supabase.from('categories').select('*').eq('account_id', profile.account_id).order('name'),
      supabase.from('expenses').select('*, profiles(name)').eq('account_id', profile.account_id).order('created_at', { ascending: false }).limit(50),
      supabase.from('financial_accounts').select('id, name, is_default').eq('account_id', profile.account_id).order('created_at', { ascending: true }),
    ])

    setExpenses(expensesRes.data ?? [])

    // Seed default financial account if none exist
    let accounts = finAccountsRes.data ?? []
    if (accounts.length === 0) {
      const { data: seeded } = await supabase
        .from('financial_accounts')
        .insert({ account_id: profile.account_id, name: 'Carteira', is_default: true })
        .select('id, name, is_default')
        .single()
      if (seeded) accounts = [seeded]
    }
    setFinancialAccounts(accounts)
    const defaultAcc = accounts.find(a => a.is_default)
    if (defaultAcc) setSelectedFinancialAccount(defaultAcc.id)

    // Seed default categories if none exist
    let cats = categoriesRes.data ?? []
    if (cats.length === 0) {
      const { data: seeded } = await supabase
        .from('categories')
        .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, account_id: profile.account_id })))
        .select()
      cats = seeded ?? []
    }
    setCategories(cats)

    await fetchMonthlySummary(selectedMonth)
    hasLoadedRef.current = true
    setLoading(false)
  }

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
      .select('id, description, amount, date, category_id, paid_at, user_id, financial_account_id, profiles(name)')
      .eq('account_id', profile.account_id)
      .eq('category_id', cat.id)
      .gte('date', `${selectedMonth}-01`)
      .lt('date', nextMonth)
      .order('date', { ascending: false })
    setAsideExpenses((data ?? []) as unknown as Expense[])
    setAsideLoading(false)
  }

  const openOthersAside = async (categoryIds: string[]) => {
    const othersCategory = { id: '__others__', name: 'Outros' }
    if (asideCategory?.id === '__others__') { setAsideCategory(null); return }
    setAsideCategory(othersCategory)
    setAsideExpenses([])
    setAsideLoading(true)
    const [y, m] = selectedMonth.split('-').map(Number)
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('expenses')
      .select('id, description, amount, date, category_id, paid_at, user_id, financial_account_id, profiles(name)')
      .eq('account_id', profile.account_id)
      .in('category_id', categoryIds)
      .gte('date', `${selectedMonth}-01`)
      .lt('date', nextMonth)
      .order('date', { ascending: false })
    setAsideExpenses((data ?? []) as unknown as Expense[])
    setAsideLoading(false)
  }

  const addExpense = async () => {
    if (!description.trim()) { toast.error('Descrição é obrigatória.'); return }
    const parsedAmount = parseMasked(amount)
    if (parsedAmount <= 0) { toast.error('Valor deve ser maior que zero.'); return }
    if (!selectedCategory) { toast.error('Selecione uma categoria.'); return }
    if (financialAccounts.length > 0 && !selectedFinancialAccount) { toast.error('Selecione uma conta.'); return }

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

    const body: Record<string, unknown> = {
      description,
      amount: parsedAmount,
      category_id: selectedCategory,
    }
    if (internalDate !== todayInternal) body.date = internalDate
    if (qty > 1) body.quantity = qty
    if (paid) body.paid = true
    if (selectedFinancialAccount) body.financial_account_id = selectedFinancialAccount

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

    // Reset form
    setDescription('')
    setAmount('')
    setSelectedCategory('')
    setExpenseDate(toLocalDateDisplay(new Date()))
    setQuantity('1')
    setPaid(false)
    const defaultAcc = financialAccounts.find(a => a.is_default)
    setSelectedFinancialAccount(defaultAcc?.id ?? '')
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
        fetchMonthlySummary(selectedMonth)
      },
    })
  }

  const togglePaid = (exp: Expense) => {
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
    setEditingExpense({
      expense: exp,
      description: exp.description,
      amountDisplay: exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      categoryId: exp.category_id ?? '',
      dateDisplay: `${parts[2]}/${parts[1]}/${parts[0]}`,
      paid: !!exp.paid_at,
      financialAccountId: exp.financial_account_id ?? '',
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
    if (financialAccounts.length > 0 && !editingExpense.financialAccountId) { toast.error('Selecione uma conta.'); return }

    const updates: Record<string, unknown> = {
      description: editingExpense.description.trim(),
      amount: parsedAmount,
      category_id: editingExpense.categoryId || null,
      date: internalDate,
      financial_account_id: editingExpense.financialAccountId || null,
    }

    if (editingExpense.paid && !exp.paid_at) updates.paid_at = new Date().toISOString()
    else if (!editingExpense.paid && exp.paid_at) updates.paid_at = null

    const { error } = await supabase.from('expenses').update(updates).eq('id', exp.id)
    if (error) { toast.error('Erro ao atualizar lançamento.'); return }

    const editedFields = {
      description: updates.description as string,
      amount: updates.amount as number,
      category_id: updates.category_id as string | null,
      date: updates.date as string,
      financial_account_id: updates.financial_account_id as string | null,
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

  // ── Derived state ──────────────────────────

  const categoryMap = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
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
      if (!e.paid_at) unpaid += e.amount
    }
    return { totalMonth: total, totalUnpaid: unpaid }
  }, [monthlyData])

  // ── Loading ────────────────────────────────

  if (loading) return <LoadingPage />

  // ── Render ─────────────────────────────────

  return (
    <div className="min-h-screen bg-white p-4">
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
            selectedFinancialAccount={selectedFinancialAccount}
            setSelectedFinancialAccount={setSelectedFinancialAccount}
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
            onOthersClick={openOthersAside}
          />
        </div>

        <RecentExpenses
          expenses={expenses}
          categories={categories}
          financialAccounts={financialAccounts}
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
            <h3 className="text-lg font-bold text-gray-800 mb-1">Alterar categoria</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">{exp?.description}</p>
            <div className="flex items-center gap-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${from?.color ?? 'bg-gray-400'} text-white`}>
                {from?.name ?? 'Sem categoria'}
              </span>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
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
            <h3 className="text-lg font-bold text-gray-800 mb-1">Marcar como pago?</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">{exp.description}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$)</label>
              <input
                type="text"
                inputMode="numeric"
                value={amountDisplay}
                onChange={e => setPendingPaidToggle(prev => prev ? { ...prev, amountDisplay: applyMask(e.target.value) } : null)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${!isValid && amountDisplay ? 'border-red-400' : 'border-gray-300'}`}
              />
              {!isValid && amountDisplay && <p className="text-xs text-red-500 mt-1">Valor inválido.</p>}
            </div>
            {financialAccounts.length > 0 && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Conta</label>
                <select
                  value={financialAccountId}
                  onChange={e => setPendingPaidToggle(prev => prev ? { ...prev, financialAccountId: e.target.value } : null)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm ${!financialAccountId ? 'text-gray-400' : 'text-gray-700'} border-gray-300`}
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
        const { description: editDesc, amountDisplay, categoryId, dateDisplay, paid: editPaid, financialAccountId } = editingExpense
        const parsedAmount = parseMasked(amountDisplay)
        const amountValid = parsedAmount > 0 && parsedAmount <= 1_000_000
        const showDateError = dateDisplay !== '' && parseDateDisplay(dateDisplay) === ''

        return (
          <Modal
            open={true}
            onClose={() => setEditingExpense(null)}
            size="sm"
            title="Editar lançamento"
            showClose
          >
            <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={editDesc}
                    onChange={e => setEditingExpense(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountDisplay}
                    onChange={e => setEditingExpense(prev => prev ? { ...prev, amountDisplay: applyMask(e.target.value) } : null)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm ${!amountValid && amountDisplay ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {!amountValid && amountDisplay && <p className="text-xs text-red-500 mt-1">Valor inválido.</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={e => setEditingExpense(prev => prev ? { ...prev, categoryId: e.target.value } : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-700"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm ${showDateError ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {showDateError && <p className="text-xs text-red-500 mt-1">Data inválida.</p>}
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <label className="text-sm font-medium text-gray-700">Pago</label>
                  <button
                    type="button"
                    onClick={() => setEditingExpense(prev => prev ? { ...prev, paid: !prev.paid } : null)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition ${editPaid ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    {editPaid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    <span>{editPaid ? 'Sim' : 'Não'}</span>
                  </button>
                </div>

                {financialAccounts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Conta</label>
                    <select
                      value={financialAccountId}
                      onChange={e => setEditingExpense(prev => prev ? { ...prev, financialAccountId: e.target.value } : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-700"
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

            <div className="flex gap-3 mt-6">
              <Button
                variant="destructive"
                size="md"
                onClick={saveEditedExpense}
                className="flex-1"
              >
                Salvar
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setEditingExpense(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </Modal>
        )
      })()}

      <ConfirmModal {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
      <Toasts toasts={toasts} dismiss={dismiss} />

      <CategoryExpensesAside
        category={asideCategory}
        expenses={asideExpenses}
        onClose={() => setAsideCategory(null)}
        selectedMonth={selectedMonth}
        loading={asideLoading}
        onTogglePaid={(exp) => togglePaid(exp as unknown as Expense)}
        onEdit={(exp) => openEditModal(exp as unknown as Expense)}
      />
    </div>
  )
}