'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'
import { PlusCircle, Users, Calendar, Trash2, LogOut, X, ChevronLeft, ChevronRight, ChevronDown, Repeat, PieChart, User as UserIcon, Circle, CheckCircle2, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast, Toasts, useConfirm, ConfirmModal } from './toast'
import Logo from './Logo'
import BillingBanner from './BillingBanner'

type Profile = { id: string; name: string; account_id: string; role: string }
type Account = { id: string; trial_ends_at: string; subscription_status: string } | null
type Category = { id: string; account_id: string; name: string; color: string }
type Expense = {
  id: string
  account_id: string
  user_id: string
  description: string
  amount: number
  category_id: string | null
  date: string
  paid_at: string | null
  created_at: string
  profiles: { name: string } | null
}

const MAX_CENTS = 100_000_000 // R$ 1.000.000,00

function applyMask(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const cents = Math.min(parseInt(digits, 10), MAX_CENTS)
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseMasked(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

const FIELD_PATTERN = /[^a-zA-Z0-9\-\/\. À-ÿ]/g

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', color: 'bg-orange-500' },
  { name: 'Transporte', color: 'bg-blue-500' },
  { name: 'Saúde', color: 'bg-red-500' },
  { name: 'Lazer', color: 'bg-purple-500' },
  { name: 'Moradia', color: 'bg-green-500' },
  { name: 'Educação', color: 'bg-indigo-500' },
  { name: 'Vestuário', color: 'bg-pink-500' },
  { name: 'Outros', color: 'bg-gray-500' },
]

const AVATAR_COLORS = ['#3b82f6','#22c55e','#a855f7','#f97316','#ef4444','#14b8a6','#6366f1','#ec4899']

const MONTHS_PT_LOWER = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toLocalDateDisplay(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()}`
}

// Applies DD/MM/AAAA mask as the user types
function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// Converts DD/MM/AAAA → YYYY-MM-DD; returns '' if incomplete or invalid
function parseDateDisplay(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length < 8) return ''
  const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8)
  const parsed = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  if (parsed.getDate() !== parseInt(d) || parsed.getMonth() !== parseInt(m) - 1) return ''
  return `${y}-${m}-${d}`
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function getAvatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function Dashboard({ user, profile, account }: { user: User; profile: Profile; account: Account }) {
  const supabase = createClient()
  const router = useRouter()

  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [members, setMembers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [expenseDate, setExpenseDate] = useState(() => toLocalDateDisplay(new Date()))
  const [quantity, setQuantity] = useState('1')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [filterCategoryId, setFilterCategoryId] = useState<string>('')
  const [pendingCategoryChange, setPendingCategoryChange] = useState<{ expenseId: string; newCategoryId: string | null } | null>(null)
  const [pendingPaidToggle, setPendingPaidToggle] = useState<{ expense: Expense; amountDisplay: string } | null>(null)
  const [paid, setPaid] = useState(false)

  const { toasts, toast, dismiss } = useToast()
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [membersRes, categoriesRes, expensesRes] = await Promise.all([
      supabase.from('profiles').select('id, name, account_id, role').eq('account_id', profile.account_id),
      supabase.from('categories').select('*').eq('account_id', profile.account_id).order('name'),
      supabase.from('expenses').select('*, profiles(name)').eq('account_id', profile.account_id).order('created_at', { ascending: false }).limit(100),
    ])

    setMembers(membersRes.data ?? [])
    setExpenses(expensesRes.data ?? [])

    let cats = categoriesRes.data ?? []
    if (cats.length === 0) {
      const { data: seeded } = await supabase
        .from('categories')
        .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, account_id: profile.account_id })))
        .select()
      cats = seeded ?? []
    }
    setCategories(cats)

    setLoading(false)
  }

  const addExpense = async () => {
    if (!description.trim()) { toast.error('Descrição é obrigatória.'); return }
    const parsedAmount = parseMasked(amount)
    if (parsedAmount <= 0) { toast.error('Valor deve ser maior que zero.'); return }
    if (!selectedCategory) { toast.error('Selecione uma categoria.'); return }

    const today = new Date()
    const todayInternal = toLocalDateStr(today)
    const internalDate = parseDateDisplay(expenseDate)

    if (!internalDate) {
      toast.error('Data inválida. Use o formato DD/MM/AAAA.')
      return
    }

    if (internalDate !== todayInternal) {
      const [y, m, d] = internalDate.split('-').map(Number)
      const parsed = new Date(y, m - 1, d)
      const minDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
      if (parsed < minDate || parsed > maxDate) {
        toast.error('Data fora do intervalo permitido (máx. 1 ano atrás e 1 ano à frente).')
        return
      }
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

    // Send date only when it differs from today so server uses exact timestamp for same-day entries
    const body: Record<string, unknown> = {
      description,
      amount: parsedAmount,
      category_id: selectedCategory,
    }
    if (internalDate !== todayInternal) body.date = internalDate
    if (qty > 1) body.quantity = qty
    if (paid) body.paid = true

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error ?? 'Erro ao adicionar despesa.')
      return
    }

    const created: Expense[] = Array.isArray(json) ? json : [json]
    setExpenses([...created, ...expenses])
    setDescription('')
    setAmount('')
    setSelectedCategory('')
    setExpenseDate(toLocalDateDisplay(new Date()))
    setQuantity('1')
    setPaid(false)
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
      },
    })
  }

  const togglePaid = (exp: Expense) => {
    if (!exp.paid_at) {
      setPendingPaidToggle({
        expense: exp,
        amountDisplay: exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
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
        },
      })
    }
  }

  const updateExpenseCategory = async (expenseId: string, newCategoryId: string | null) => {
    const original = expenses.find(e => e.id === expenseId)?.category_id ?? null
    setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, category_id: newCategoryId } : e))
    setEditingCategoryId(null)
    const { error } = await supabase.from('expenses').update({ category_id: newCategoryId }).eq('id', expenseId)
    if (error) {
      setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, category_id: original } : e))
      toast.error('Erro ao atualizar categoria.')
    }
  }

  const CATEGORY_COLORS = [
    'bg-orange-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500',
    'bg-green-500', 'bg-indigo-500', 'bg-pink-500', 'bg-gray-500',
    'bg-yellow-500', 'bg-teal-500', 'bg-cyan-500', 'bg-rose-500',
  ]

  const addCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    if (name.length < 3) {
      toast.error('O nome da categoria deve ter pelo menos 3 caracteres.')
      return
    }

    const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    })

    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error ?? 'Erro ao adicionar categoria.')
      return
    }

    setCategories([...categories, json])
    setSelectedCategory(json.id)
    setNewCategoryName('')
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)

  const shiftMonth = (delta: number) => {
    const d = new Date(selYear, selMonthNum - 1 + delta)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const getMonthlyExpenses = () =>
    expenses.filter(e => new Date(e.date).toISOString().slice(0, 7) === selectedMonth)

  const getCategorySummary = () => {
    const monthly = getMonthlyExpenses()
    return categories.map(cat => ({
      ...cat,
      total: monthly.filter(e => e.category_id === cat.id).reduce((sum, e) => sum + e.amount, 0),
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Logo />
      </div>
    )
  }

  const categorySummary = getCategorySummary()
  const monthlyExpenses = getMonthlyExpenses()
  const totalMonth = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalUnpaid = monthlyExpenses.filter(e => !e.paid_at).reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">

            <Link href="/app"><Logo height={40} width={130} /></Link>
            <div className="flex items-center gap-3">
              <Link
                href="/app/charts"
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                title="Ver gráficos"
              >
                <PieChart size={20} className="text-gray-600" />
                <span className="text-gray-700 font-medium">Gráficos</span>
              </Link>
              {profile.role === 'owner' ? (
                <Link
                  href="/app/users"
                  className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                  <Users size={20} className="text-gray-600" />
                  <span className="text-gray-700 font-medium">{members.length} usuário(s)</span>
                </Link>
              ) : (
                <div className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                  <Users size={20} className="text-gray-600" />
                  <span className="text-gray-700 font-medium">{members.length} usuário(s)</span>
                </div>
              )}

              {/* Avatar dropdown */}
              <div className="relative" ref={avatarRef}>
                <button
                  onClick={() => setShowAvatarMenu(v => !v)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow hover:opacity-90 transition"
                  style={{ backgroundColor: getAvatarColor(profile.name) }}
                  title={profile.name}
                >
                  {getInitials(profile.name)}
                </button>
                {showAvatarMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      href="/app/profile"
                      onClick={() => setShowAvatarMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition text-sm"
                    >
                      <UserIcon size={16} className="text-gray-400" />
                      {profile.name}
                    </Link>
                    <Link
                      href="/app/plan"
                      onClick={() => setShowAvatarMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition text-sm"
                    >
                      <CreditCard size={16} className="text-gray-400" />
                      Meu plano
                    </Link>
                    {profile.role === 'owner' ? (
                      <Link
                        href="/app/users"
                        onClick={() => setShowAvatarMenu(false)}
                        className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition text-sm"
                      >
                        <Users size={16} className="text-gray-400" />
                        {members.length} usuário(s)
                      </Link>
                    ) : (
                      <div className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-gray-500 text-sm">
                        <Users size={16} className="text-gray-400" />
                        {members.length} usuário(s)
                      </div>
                    )}
                    <hr className="border-gray-100" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition text-sm"
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {account && (
          <BillingBanner
            subscriptionStatus={account.subscription_status}
            trialEndsAt={account.trial_ends_at}
            isOwner={profile.role === 'owner'}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Expense Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PlusCircle size={24} className="text-red-600" />
              Nova despesa
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <input
                  type="text"
                  maxLength={60}
                  value={description}
                  onChange={e => setDescription(e.target.value.replace(FIELD_PATTERN, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Ex: Supermercado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={e => setAmount(applyMask(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium transition ${
                        selectedCategory === cat.id
                          ? `${cat.color} text-white`
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <button onClick={() => setSelectedCategory(cat.id)}>
                        {cat.name}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteCategory(cat) }}
                        className={`rounded-full p-0.5 hover:bg-black/20 transition ${
                          selectedCategory === cat.id ? 'text-white' : 'text-gray-400'
                        }`}
                        title="Excluir categoria"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}

                  {/* Nova categoria inline */}
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-gray-50 border-2 border-dashed border-gray-300">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value.replace(FIELD_PATTERN, ''))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
                      placeholder="Nova categoria"
                      maxLength={60}
                      className="bg-transparent outline-none w-32 text-gray-500 placeholder-gray-400 text-sm"
                    />
                  </div>
                </div>
              </div>
              {/* Advanced options toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(v => !v)}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition w-full"
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                  />
                  <span>Opções avançadas</span>
                  {!showAdvanced && (parseDateDisplay(expenseDate) || quantity !== '1' || paid) && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-red-500 font-medium">
                      {quantity !== '1' && <Repeat size={11} />}
                      {quantity !== '1' ? `${quantity}×` : ''}
                      {parseDateDisplay(expenseDate) ? ` ${expenseDate}` : ''}
                      {paid && <CheckCircle2 size={11} className="text-green-500" />}
                    </span>
                  )}
                </button>

                {showAdvanced && (() => {
                  const today = new Date()
                  const todayStr = toLocalDateStr(today)
                  const internalDate = parseDateDisplay(expenseDate)
                  const dateStr = internalDate || todayStr
                  const qty = Math.max(1, Math.min(99, parseInt(quantity, 10) || 1))

                  const installmentWarning = (() => {
                    if (qty <= 1) return null
                    const [y, m, d] = dateStr.split('-').map(Number)
                    for (let i = 1; i < qty; i++) {
                      const check = new Date(y, m - 1 + i, d)
                      if (check.getDate() !== d) {
                        const idx = (m - 1 + i) % 12
                        const yr = y + Math.floor((m - 1 + i) / 12)
                        return `Dia ${d} não existe em ${MONTHS_PT_LOWER[idx]} de ${yr}`
                      }
                    }
                    return null
                  })()

                  const installmentPreview = (() => {
                    if (qty <= 1 || installmentWarning) return null
                    const [y, m, d] = dateStr.split('-').map(Number)
                    const last = new Date(y, m - 1 + qty - 1, d)
                    const fmt = (dd: number, mm: number, yy: number) =>
                      `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${yy}`
                    return `${fmt(d, m, y)} à ${fmt(last.getDate(), last.getMonth() + 1, last.getFullYear())}`
                  })()

                  return (
                    <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50 rounded-xl px-3 py-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Data
                        </label>
                        <div className="relative">
                          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={expenseDate}
                            onChange={e => setExpenseDate(applyDateMask(e.target.value))}
                            placeholder="DD/MM/AAAA"
                            maxLength={10}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-700 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          value={quantity}
                          onChange={e => {
                            const v = e.target.value
                            if (v === '' || (parseInt(v, 10) >= 1 && parseInt(v, 10) <= 99)) setQuantity(v)
                          }}
                          min="1"
                          max="99"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        />
                        {installmentWarning ? (
                          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                            <span>⚠</span> {installmentWarning}
                          </p>
                        ) : installmentPreview ? (
                          <div className="mt-2 flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            <Repeat size={13} className="text-red-400 shrink-0" />
                            <div className="leading-snug">
                              <p className="text-xs text-red-400">{installmentPreview}</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between py-0.5">
                        <label className="text-sm font-medium text-gray-700">Pago</label>
                        <button
                          type="button"
                          onClick={() => setPaid(v => !v)}
                          className={`flex items-center gap-1.5 text-sm font-medium transition ${paid ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {paid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          <span>{paid ? 'Sim' : 'Não'}</span>
                        </button>
                      </div>
                      {paid && qty > 1 && (
                        <p className="text-xs text-amber-500">Parcelas futuras serão salvas como não pagas.</p>
                      )}
                    </div>
                  )
                })()}
              </div>

              <button
                onClick={addExpense}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                {parseInt(quantity, 10) > 1 ? `Adicionar ${quantity} parcelas` : 'Adicionar despesa'}
              </button>
            </div>
          </div>

          {/* Category Summary */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-800">Resumo por categoria</h2>
              <div className="flex items-center gap-1 sm:self-auto">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
                  title="Mês anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex flex-1 sm:flex-none items-center gap-2 px-4 py-1.5 bg-red-50 border border-red-200 rounded-lg sm:min-w-[160px] justify-center">
                  <Calendar size={15} className="text-red-500 shrink-0" />
                  <span className="text-sm font-semibold text-red-700">
                    {MONTHS_PT[selMonthNum - 1]} {selYear}
                  </span>
                </div>
                <button
                  onClick={() => shiftMonth(1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
                  title="Próximo mês"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 mb-4 flex justify-between items-start gap-4">
              <div>
                <p className="text-sm text-gray-600">Total do mês</p>
                <p className="text-3xl font-bold text-red-600">
                  R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              {totalUnpaid > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Não pagos</p>
                  <p className="text-xl font-bold text-orange-500">
                    R$ {totalUnpaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {categorySummary.filter(cat => cat.total > 0).length === 0 && (
                <p className="text-center text-gray-500 py-4">Nenhuma despesa neste mês.</p>
              )}
              {categorySummary.filter(cat => cat.total > 0).map(cat => {
                const pct = totalMonth > 0 ? (cat.total / totalMonth) * 100 : 0
                return (
                  <div key={cat.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                        <span className="font-medium text-gray-700">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium text-gray-500">{pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                        <span className="font-bold text-gray-800 text-right">
                          R$ {cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`${cat.color} h-1.5 rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Últimos lançamentos</h2>
            <select
              value={filterCategoryId}
              onChange={e => setFilterCategoryId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 sm:w-48"
            >
              <option value="">Todas as categorias</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          {editingCategoryId && (
            <div className="fixed inset-0 z-10" onClick={() => setEditingCategoryId(null)} />
          )}
          <div className="space-y-2">
            {(filterCategoryId ? expenses.filter(e => e.category_id === filterCategoryId) : expenses).slice(0, 20).map(exp => {
              const category = categories.find(c => c.id === exp.category_id)
              const date = new Date(exp.date)
              const isOwn = exp.user_id === user.id
              return (
                <div key={exp.id}>
                  {/* Mobile card */}
                  <div className="sm:hidden p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${category?.color ?? 'bg-gray-400'}`} />
                        <p className="font-medium text-gray-800 leading-snug">{exp.description}</p>
                      </div>
                      <p className="font-bold text-gray-800 shrink-0 ml-2">
                        R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-4">
                      {exp.profiles?.name} • {date.toLocaleDateString('pt-BR')} às{' '}
                      {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center justify-between mt-2.5 ml-4">
                      <div className="relative">
                        {isOwn ? (
                          <button
                            onClick={() => setEditingCategoryId(editingCategoryId === exp.id ? null : exp.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${category?.color ?? 'bg-gray-400'} text-white flex items-center gap-1 hover:opacity-80 transition`}
                          >
                            {category?.name ?? 'Sem categoria'}
                            <ChevronDown size={10} className="opacity-70" />
                          </button>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${category?.color ?? 'bg-gray-400'} text-white`}>
                            {category?.name ?? 'Sem categoria'}
                          </span>
                        )}
                        {editingCategoryId === exp.id && (
                          <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px]">
                            {categories.map(cat => (
                              <button
                                key={cat.id}
                                onClick={() => { setEditingCategoryId(null); setPendingCategoryChange({ expenseId: exp.id, newCategoryId: cat.id }) }}
                                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left transition ${cat.id === exp.category_id ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${cat.color} shrink-0`} />
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {isOwn && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => togglePaid(exp)}
                            title={exp.paid_at ? 'Desmarcar pagamento' : 'Marcar como pago'}
                            className={`transition ${exp.paid_at ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'}`}
                          >
                            {exp.paid_at ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                          <button
                            onClick={() => deleteExpense(exp.id)}
                            title="Excluir lançamento"
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop row */}
                  <div className="hidden sm:flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-2 h-2 rounded-full ${category?.color ?? 'bg-gray-400'}`} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{exp.description}</p>
                        <p className="text-sm text-gray-500">
                          {exp.profiles?.name} • {date.toLocaleDateString('pt-BR')} às{' '}
                          {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="relative">
                        {isOwn ? (
                          <button
                            onClick={() => setEditingCategoryId(editingCategoryId === exp.id ? null : exp.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${category?.color ?? 'bg-gray-400'} text-white flex items-center gap-1 hover:opacity-80 transition`}
                          >
                            {category?.name ?? 'Sem categoria'}
                            <ChevronDown size={10} className="opacity-70" />
                          </button>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${category?.color ?? 'bg-gray-400'} text-white`}>
                            {category?.name ?? 'Sem categoria'}
                          </span>
                        )}
                        {editingCategoryId === exp.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px]">
                            {categories.map(cat => (
                              <button
                                key={cat.id}
                                onClick={() => { setEditingCategoryId(null); setPendingCategoryChange({ expenseId: exp.id, newCategoryId: cat.id }) }}
                                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left transition ${cat.id === exp.category_id ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${cat.color} shrink-0`} />
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-gray-800 min-w-[100px] text-right">
                        R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {isOwn && (
                      <div className="ml-4 flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => togglePaid(exp)}
                          title={exp.paid_at ? 'Desmarcar pagamento' : 'Marcar como pago'}
                          className={`transition ${exp.paid_at ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'}`}
                        >
                          {exp.paid_at ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          title="Excluir lançamento"
                          className="text-red-500 hover:text-red-700 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {expenses.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhuma despesa cadastrada ainda.</p>
            )}
            {expenses.length > 0 && filterCategoryId && expenses.filter(e => e.category_id === filterCategoryId).length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhum lançamento nesta categoria.</p>
            )}
          </div>
        </div>
      </div>

      {pendingCategoryChange && (() => {
        const exp = expenses.find(e => e.id === pendingCategoryChange.expenseId)
        const from = categories.find(c => c.id === exp?.category_id)
        const to = categories.find(c => c.id === pendingCategoryChange.newCategoryId)
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
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
                <button
                  onClick={() => { updateExpenseCategory(pendingCategoryChange.expenseId, pendingCategoryChange.newCategoryId); setPendingCategoryChange(null) }}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setPendingCategoryChange(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {pendingPaidToggle && (() => {
        const { expense: exp, amountDisplay } = pendingPaidToggle
        const newAmount = parseMasked(amountDisplay)
        const isValid = newAmount > 0 && newAmount <= 1_000_000
        const amountChanged = isValid && newAmount !== exp.amount
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Marcar como pago?</h3>
              <p className="text-sm text-gray-500 mb-4 truncate">{exp.description}</p>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountDisplay}
                  onChange={e => setPendingPaidToggle(prev => prev ? { ...prev, amountDisplay: applyMask(e.target.value) } : null)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${!isValid && amountDisplay ? 'border-red-400' : 'border-gray-300'}`}
                />
                {!isValid && amountDisplay && (
                  <p className="text-xs text-red-500 mt-1">Valor inválido.</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  disabled={!isValid}
                  onClick={async () => {
                    if (!isValid) return
                    const now = new Date().toISOString()
                    const updates: Record<string, unknown> = { paid_at: now }
                    if (amountChanged) updates.amount = newAmount
                    const { error } = await supabase.from('expenses').update(updates).eq('id', exp.id)
                    if (error) { toast.error('Erro ao atualizar lançamento.'); return }
                    setExpenses(prev => prev.map(e =>
                      e.id === exp.id ? { ...e, paid_at: now, ...(amountChanged ? { amount: newAmount } : {}) } : e
                    ))
                    setPendingPaidToggle(null)
                  }}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {amountChanged ? 'Editar e pagar' : 'Marcar pago'}
                </button>
                <button
                  onClick={() => setPendingPaidToggle(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <ConfirmModal {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
