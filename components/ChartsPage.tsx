'use client'

import { useState, useMemo } from 'react'
import BillingBanner from './BillingBanner'
import DashboardHeader from './dashboard/DashboardHeader'
import MonthSelector from './charts/MonthSelector'
import CategoryPieChart from './charts/CategoryPieChart'
import CategoryExpensesAside from './charts/CategoryExpensesAside'
import MonthlyTrendChart from './charts/MonthlyTrendChart'
import { useToast, Toasts } from './toast'
import { COLOR_MAP, FALLBACK_COLORS, MONTHS_PT } from './charts/helpers'
import type { Profile, Account, Category, Expense } from './charts/types'
import { generateVirtualOccurrences } from '@/lib/recurring'
import type { RecurringExpense } from '@/lib/recurring'

export default function ChartsPage({ profile, categories, expenses, account, recurringTemplates: initialRecurringTemplates = [] }: {
  profile: Profile
  categories: Category[]
  expenses: Expense[]
  account: Account
  recurringTemplates?: RecurringExpense[]
}) {
  const now = new Date()
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(nowKey)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringExpense[]>(initialRecurringTemplates)
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)
  const { toasts, toast, dismiss } = useToast()

  const shiftMonth = (delta: number) => {
    const d = new Date(selYear, selMonthNum - 1 + delta)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthlyExpenses = useMemo(() => {
    const real = expenses.filter(e => e.date.slice(0, 7) === selectedMonth && !(e as unknown as { skipped?: boolean }).skipped)
    const materializedKeys = new Set(
      real
        .filter(e => (e as unknown as { recurring_expense_id?: string }).recurring_expense_id && (e as unknown as { occurrence_year_month?: string }).occurrence_year_month)
        .map(e => `${(e as unknown as { recurring_expense_id: string }).recurring_expense_id}:${(e as unknown as { occurrence_year_month: string }).occurrence_year_month}`)
    )
    const virtuals = generateVirtualOccurrences(recurringTemplates, selectedMonth, materializedKeys)
    return [...real, ...virtuals] as unknown as Expense[]
  }, [expenses, selectedMonth, recurringTemplates])

  const totalMonth = monthlyExpenses.reduce((s, e) => s + e.amount, 0)

  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 9 }, (_, i) => {
      const d = new Date(selYear, selMonthNum - 1 - 4 + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${MONTHS_PT[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(2)}`
      const real = expenses.filter(e => e.date.slice(0, 7) === key && !(e as unknown as { skipped?: boolean }).skipped)
      const materializedKeys = new Set(
        real
          .filter(e => (e as unknown as { recurring_expense_id?: string }).recurring_expense_id && (e as unknown as { occurrence_year_month?: string }).occurrence_year_month)
          .map(e => `${(e as unknown as { recurring_expense_id: string }).recurring_expense_id}:${(e as unknown as { occurrence_year_month: string }).occurrence_year_month}`)
      )
      const virtuals = generateVirtualOccurrences(recurringTemplates, key, materializedKeys)
      const total = [...real, ...virtuals].reduce((s, e) => s + e.amount, 0)
      return { key, label, total, isCurrent: key === selectedMonth }
    })
  }, [expenses, recurringTemplates, selectedMonth, selMonthNum, selYear])

  const { categoryPieData, smallCategoryIds } = useMemo(() => {
    const data = categories
      .map((cat, i) => ({
        id: cat.id,
        name: cat.name,
        value: monthlyExpenses.filter(e => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0),
        fill: COLOR_MAP[cat.color] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
    const total = data.reduce((s, d) => s + d.value, 0)
    const withPercent = data.map(d => ({ ...d, percent: total > 0 ? d.value / total : 0 }))
    const main = withPercent.filter(d => d.percent >= 0.05)
    const small = withPercent.filter(d => d.percent < 0.05)
    const smallIds = new Set(small.map(d => d.id))
    if (small.length === 0) return { categoryPieData: withPercent, smallCategoryIds: smallIds }
    const othersValue = small.reduce((s, d) => s + d.value, 0)
    return {
      categoryPieData: [
        ...main,
        { id: '__others__', name: 'Outros', value: othersValue, fill: '#9ca3af', percent: total > 0 ? othersValue / total : 0 },
      ],
      smallCategoryIds: smallIds,
    }
  }, [categories, monthlyExpenses])

  const selectedCategory = useMemo(() => {
    if (selectedCategoryId === '__others__') return { id: '__others__', name: 'Outros' }
    return categories.find(c => c.id === selectedCategoryId) ?? null
  }, [categories, selectedCategoryId])

  const asideExpenses = useMemo(() => {
    if (!selectedCategory) return []
    if (selectedCategory.id === '__others__') {
      return monthlyExpenses.filter(e => e.category_id !== null && smallCategoryIds.has(e.category_id))
    }
    return monthlyExpenses.filter(e => e.category_id === selectedCategory.id)
  }, [monthlyExpenses, selectedCategory, smallCategoryIds])

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
    setRecurringTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
    toast.success('Recorrência encerrada.')
  }

  return (
    <>
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
          <MonthSelector selectedMonth={selectedMonth} onShift={shiftMonth} totalMonth={totalMonth} />
          <div className="grid grid-cols-1 gap-6 mb-6">
            <CategoryPieChart
              data={categoryPieData}
              onCategoryClick={id => setSelectedCategoryId(prev => prev === id ? null : id)}
            />
            {/* <UserBarChart data={userBarData} /> */}
          </div>
          {/* {financialAccounts.length > 0 && (
            <AccountPieChart data={accountPieData} />
          )} */}
          <MonthlyTrendChart data={monthlyTrend} />
        </div>
      </div>

      <CategoryExpensesAside
        category={selectedCategory}
        expenses={asideExpenses as Parameters<typeof CategoryExpensesAside>[0]['expenses']}
        onClose={() => setSelectedCategoryId(null)}
        selectedMonth={selectedMonth}
        onEndRecurrence={handleEndRecurrence}
      />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </>
  )
}
