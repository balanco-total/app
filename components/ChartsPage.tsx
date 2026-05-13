'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Calendar, ChevronLeft, ChevronRight, Users, LogOut, User as UserIcon, CreditCard, Home, Landmark } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Logo from './Logo'
import BillingBanner from './BillingBanner'

type Profile = { id: string; name: string; account_id: string; role: string }
type Account = { id: string; trial_ends_at: string; subscription_status: string } | null
type Category = { id: string; name: string; color: string }
type Expense = {
  id: string
  user_id: string
  amount: number
  category_id: string | null
  financial_account_id: string | null
  date: string
  profiles: { name: string } | null
}

type FinancialAccount = { id: string; name: string }

const COLOR_MAP: Record<string, string> = {
  'bg-orange-500': '#f97316',
  'bg-blue-500':  '#3b82f6',
  'bg-red-500':   '#ef4444',
  'bg-purple-500': '#a855f7',
  'bg-green-500':  '#22c55e',
  'bg-indigo-500': '#6366f1',
  'bg-pink-500':   '#ec4899',
  'bg-gray-500':   '#6b7280',
  'bg-yellow-500': '#eab308',
  'bg-teal-500':   '#14b8a6',
  'bg-cyan-500':   '#06b6d4',
  'bg-rose-500':   '#f43f5e',
}

const FALLBACK_COLORS = [
  '#3b82f6','#f97316','#22c55e','#a855f7','#ef4444',
  '#6366f1','#ec4899','#14b8a6','#eab308','#06b6d4',
]

const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const AVATAR_COLORS = ['#3b82f6','#22c55e','#a855f7','#f97316','#ef4444','#14b8a6','#6366f1','#ec4899']

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function getAvatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const fmt = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtAxis = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v.toFixed(0)}`

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-red-600 font-bold">{fmt(payload[0].value)}</p>
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700">{payload[0].name}</p>
      <p className="font-bold" style={{ color: payload[0].payload.fill }}>{fmt(payload[0].value)}</p>
      <p className="text-gray-500">{(payload[0].payload.percent * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</p>
    </div>
  )
}

export default function ChartsPage({ profile, categories, expenses, account, financialAccounts = [] }: {
  profile: Profile
  categories: Category[]
  expenses: Expense[]
  account: Account
  financialAccounts?: FinancialAccount[]
}) {
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const now = new Date()
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [selectedMonth, setSelectedMonth] = useState(nowKey)

  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)

  const shiftMonth = (delta: number) => {
    const d = new Date(selYear, selMonthNum - 1 + delta)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 9 }, (_, i) => {
      const d = new Date(selYear, selMonthNum - 1 - 4 + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${MONTHS_PT[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(2)}`
      const total = expenses
        .filter(e => e.date.slice(0, 7) === key)
        .reduce((s, e) => s + e.amount, 0)
      return { key, label, total, isCurrent: key === nowKey }
    })
  }, [expenses, selectedMonth])

  const monthlyExpenses = useMemo(
    () => expenses.filter(e => e.date.slice(0, 7) === selectedMonth),
    [expenses, selectedMonth]
  )

  const totalMonth = monthlyExpenses.reduce((s, e) => s + e.amount, 0)

  const categoryPieData = useMemo(() => {
    const data = categories
      .map((cat, i) => ({
        name: cat.name,
        value: monthlyExpenses.filter(e => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0),
        fill: COLOR_MAP[cat.color] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)

    const total = data.reduce((s, d) => s + d.value, 0)
    return data.map(d => ({ ...d, percent: total > 0 ? d.value / total : 0 }))
  }, [categories, monthlyExpenses])

  const userBarData = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>()
    monthlyExpenses.forEach(e => {
      const name = e.profiles?.name ?? 'Desconhecido'
      const cur = map.get(e.user_id) ?? { name, total: 0 }
      map.set(e.user_id, { name, total: cur.total + e.amount })
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [monthlyExpenses])

  const accountPieData = useMemo(() => {
    if (financialAccounts.length === 0) return []
    const data = financialAccounts
      .map((acc, i) => ({
        name: acc.name,
        value: monthlyExpenses.filter(e => e.financial_account_id === acc.id).reduce((s, e) => s + e.amount, 0),
        fill: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)

    const unassigned = monthlyExpenses.filter(e => !e.financial_account_id).reduce((s, e) => s + e.amount, 0)
    if (unassigned > 0) data.push({ name: 'Sem conta', value: unassigned, fill: '#d1d5db' })

    const total = data.reduce((s, d) => s + d.value, 0)
    return data.map(d => ({ ...d, percent: total > 0 ? d.value / total : 0 }))
  }, [financialAccounts, monthlyExpenses])

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header — identical to Dashboard */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <Link href="/app"><Logo height={40} width={130} /></Link>
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                title="Voltar ao dashboard"
              >
                <Home size={20} className="text-gray-600" />
                <span className="text-gray-700 font-medium">Dashboard</span>
              </Link>
              <Link
                href="/app/accounts"
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                title="Contas financeiras"
              >
                <Landmark size={20} className="text-gray-600" />
                <span className="text-gray-700 font-medium hidden sm:inline">Contas</span>
              </Link>
              {profile.role === 'owner' ? (
                <Link
                  href="/app/users"
                  className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                  <Users size={20} className="text-gray-600" />
                  <span className="text-gray-700 font-medium">Usuários</span>
                </Link>
              ) : (
                <div className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                  <Users size={20} className="text-gray-600" />
                  <span className="text-gray-700 font-medium">Usuários</span>
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
                        Usuários
                      </Link>
                    ) : (
                      <div className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-gray-500 text-sm">
                        <Users size={16} className="text-gray-400" />
                        Usuários
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

        {/* Month filter + total */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="hidden sm:block text-gray-600 mt-0.5 text-sm sm:text-base">Análise visual das suas despesas</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500" title="Mês anterior">
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 border border-red-200 rounded-lg min-w-[160px] justify-center">
                  <Calendar size={15} className="text-red-500 shrink-0" />
                  <span className="text-sm font-semibold text-red-700">{MONTHS_PT[selMonthNum - 1]} {selYear}</span>
                </div>
                <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500" title="Próximo mês">
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="text-right shrink-0 pl-2 border-l border-gray-200">
                <p className="text-xs text-gray-500">Total do mês</p>
                <p className="text-lg sm:text-xl font-bold text-red-600">{fmt(totalMonth)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie + User bar row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Category Pie */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Lançamentos por categoria</h2>
            {categoryPieData.length === 0 ? (
              <div className="flex items-center justify-center h-72 text-gray-400 text-sm">
                Nenhuma despesa neste mês.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="45%"
                    outerRadius={110}
                    innerRadius={50}
                    dataKey="value"
                    label={({ percent }: { percent?: number }) =>
                      (percent ?? 0) >= 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {categoryPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-gray-700">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* User Bar */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Lançamentos por úsuário</h2>
            {userBarData.length === 0 ? (
              <div className="flex items-center justify-center h-72 text-gray-400 text-sm">
                Nenhuma despesa neste mês.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={userBarData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#6b7280' }} width={60} />
                  <Tooltip content={<BarTooltip />} cursor={false} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={80}>
                    {userBarData.map((_, i) => (
                      <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Account Pie */}
        {financialAccounts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Lançamentos por conta</h2>
            {accountPieData.length === 0 ? (
              <div className="flex items-center justify-center h-72 text-gray-400 text-sm">
                Nenhuma despesa neste mês.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={accountPieData}
                    cx="50%"
                    cy="45%"
                    outerRadius={110}
                    innerRadius={50}
                    dataKey="value"
                    label={({ percent }: { percent?: number }) =>
                      (percent ?? 0) >= 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {accountPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend formatter={(value) => <span className="text-xs text-gray-700">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Monthly trend */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Evolução Mensal</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrend} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#6b7280' }} width={60} />
              <Tooltip content={<BarTooltip />} cursor={false} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {monthlyTrend.map((entry, i) => (
                  <Cell key={i} fill={entry.isCurrent ? '#ef4444' : '#fecaca'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}
