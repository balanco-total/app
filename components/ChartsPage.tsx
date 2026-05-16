'use client'

import { useState, useMemo } from 'react'
import BillingBanner from './BillingBanner'
import DashboardHeader from './dashboard/DashboardHeader'
import MonthSelector from './charts/MonthSelector'
import CategoryPieChart from './charts/CategoryPieChart'
import CategoryExpensesAside from './charts/CategoryExpensesAside'
import UserBarChart from './charts/UserBarChart'
import AccountPieChart from './charts/AccountPieChart'
import MonthlyTrendChart from './charts/MonthlyTrendChart'
import { COLOR_MAP, FALLBACK_COLORS, MONTHS_PT } from './charts/helpers'
import type { Profile, Account, Category, Expense, FinancialAccount } from './charts/types'

export default function ChartsPage({ profile, categories, expenses, account, financialAccounts = [] }: {
  profile: Profile
  categories: Category[]
  expenses: Expense[]
  account: Account
  financialAccounts?: FinancialAccount[]
}) {
  const now = new Date()
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(nowKey)
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null)
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)

  const shiftMonth = (delta: number) => {
    const d = new Date(selYear, selMonthNum - 1 + delta)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthlyExpenses = useMemo(
    () => expenses.filter(e => e.date.slice(0, 7) === selectedMonth),
    [expenses, selectedMonth]
  )

  const totalMonth = monthlyExpenses.reduce((s, e) => s + e.amount, 0)

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
  }, [expenses, nowKey, selMonthNum, selYear])

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
        { name: 'Outros', value: othersValue, fill: '#9ca3af', percent: total > 0 ? othersValue / total : 0 },
      ],
      smallCategoryIds: smallIds,
    }
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

  const selectedCategory = useMemo(() => {
    if (selectedCategoryName === 'Outros') return { id: '__others__', name: 'Outros' }
    return categories.find(c => c.name === selectedCategoryName) ?? null
  }, [categories, selectedCategoryName])

  const asideExpenses = useMemo(() => {
    if (!selectedCategory) return []
    if (selectedCategory.id === '__others__') {
      return monthlyExpenses.filter(e => e.category_id !== null && smallCategoryIds.has(e.category_id))
    }
    return monthlyExpenses.filter(e => e.category_id === selectedCategory.id)
  }, [monthlyExpenses, selectedCategory, smallCategoryIds])

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CategoryPieChart
              data={categoryPieData}
              onCategoryClick={name => setSelectedCategoryName(prev => prev === name ? null : name)}
            />
            <UserBarChart data={userBarData} />
          </div>
          {financialAccounts.length > 0 && (
            <AccountPieChart data={accountPieData} />
          )}
          <MonthlyTrendChart data={monthlyTrend} />
        </div>
      </div>

      <CategoryExpensesAside
        category={selectedCategory}
        expenses={asideExpenses}
        onClose={() => setSelectedCategoryName(null)}
        selectedMonth={selectedMonth}
      />
    </>
  )
}
