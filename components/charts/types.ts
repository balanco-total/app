export type Profile = { id: string; name: string; account_id: string; role: string }
export type Account = { id: string; trial_ends_at: string; subscription_status: string } | null
export type Category = { id: string; name: string; color: string }
export type Expense = {
  id: string
  user_id: string
  amount: number
  category_id: string | null
  financial_account_id: string | null
  date: string
  description: string | null
  profiles: { name: string } | null
}
export type FinancialAccount = { id: string; name: string }

export type PieEntry = { name: string; value: number; fill: string; percent: number }
export type TrendEntry = { key: string; label: string; total: number; isCurrent: boolean }
export type UserBarEntry = { name: string; total: number }
