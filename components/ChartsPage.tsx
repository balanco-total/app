'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type Profile = { id: string; name: string; account_id: string; role: string }
type Category = { id: string; name: string; color: string }
type Expense = {
  id: string
  user_id: string
  amount: number
  category_id: string | null
  date: string
  profiles: { name: string } | null
}

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
      <p className="text-gray-500">{(payload[0].payload.percent * 100).toFixed(1)}%</p>
    </div>
  )
}

export default function ChartsPage({ profile, categories, expenses }: {
  profile: Profile
  categories: Category[]
  expenses: Expense[]
}) {
  const now = new Date()
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [selectedMonth, setSelectedMonth] = useState(nowKey)
  const [trendCenter, setTrendCenter] = useState(nowKey)

  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)
  const [trendYear, trendMonthNum] = trendCenter.split('-').map(Number)

  const shiftMonth = (delta: number) => {
    const d = new Date(selYear, selMonthNum - 1 + delta)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const shiftTrend = (delta: number) => {
    const d = new Date(trendYear, trendMonthNum - 1 + delta)
    setTrendCenter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // 9-month window centered on trendCenter; real current month always highlighted
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 9 }, (_, i) => {
      const d = new Date(trendYear, trendMonthNum - 1 - 4 + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${MONTHS_PT[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(2)}`
      const total = expenses
        .filter(e => e.date.slice(0, 7) === key)
        .reduce((s, e) => s + e.amount, 0)
      return { key, label, total, isCurrent: key === nowKey }
    })
  }, [expenses, trendCenter])

  // Selected month expenses
  const monthlyExpenses = useMemo(
    () => expenses.filter(e => e.date.slice(0, 7) === selectedMonth),
    [expenses, selectedMonth]
  )

  const totalMonth = monthlyExpenses.reduce((s, e) => s + e.amount, 0)

  // Category pie
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

  // User bar
  const userBarData = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>()
    monthlyExpenses.forEach(e => {
      const name = e.profiles?.name ?? 'Desconhecido'
      const cur = map.get(e.user_id) ?? { name, total: 0 }
      map.set(e.user_id, { name, total: cur.total + e.amount })
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [monthlyExpenses])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-600"
              title="Voltar ao dashboard"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Gráficos</h1>
              <p className="text-gray-600 mt-1">Análise visual das suas despesas</p>
            </div>
          </div>
        </div>

        {/* Month picker + total */}
        <div className="bg-white rounded-2xl shadow-lg px-6 py-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium text-gray-600">Período dos gráficos por categoria e por usuário</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
              title="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 border border-red-200 rounded-lg min-w-[172px] justify-center">
              <Calendar size={15} className="text-red-500 shrink-0" />
              <span className="text-sm font-semibold text-red-700">
                {MONTHS_PT[selMonthNum - 1]} {selYear}
              </span>
            </div>
            <button
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
              title="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total do mês</p>
            <p className="text-xl font-bold text-red-600">{fmt(totalMonth)}</p>
          </div>
        </div>

        {/* Pie + User bar row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Category Pie */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Despesas por Categoria</h2>
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">Lançamentos por Usuário</h2>
            {userBarData.length === 0 ? (
              <div className="flex items-center justify-center h-72 text-gray-400 text-sm">
                Nenhuma despesa neste mês.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={userBarData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#6b7280' }} width={75} />
                  <Tooltip content={<BarTooltip />} />
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

        {/* Monthly trend — 9 months centered on trendCenter */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Evolução Mensal</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftTrend(-1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
                title="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 border border-red-200 rounded-lg min-w-[172px] justify-center">
                <Calendar size={15} className="text-red-500 shrink-0" />
                <span className="text-sm font-semibold text-red-700">
                  {MONTHS_PT[trendMonthNum - 1]} {trendYear}
                </span>
              </div>
              <button
                onClick={() => shiftTrend(1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
                title="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrend} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#6b7280' }} width={75} />
              <Tooltip content={<BarTooltip />} />
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
