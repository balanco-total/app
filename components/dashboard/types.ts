import type { User } from '@supabase/supabase-js'

export type { User }

export type Profile = { id: string; name: string; account_id: string; role: string }
export type Account = { id: string; trial_ends_at: string; subscription_status: string } | null
export type Category = { id: string; account_id: string; name: string; color: string }
export type Expense = {
  id: string
  account_id: string
  user_id: string
  description: string
  amount: number
  category_id: string | null
  financial_account_id: string | null
  date: string
  paid_at: string | null
  created_at: string
  profiles: { name: string } | null
}
export type FinancialAccount = { id: string; name: string; is_default: boolean }

export type CategoryWithTotal = Category & { total: number }

export type EditingExpenseState = {
  expense: Expense
  description: string
  amountDisplay: string
  categoryId: string
  dateDisplay: string
  paid: boolean
  financialAccountId: string
}

export type PendingCategoryChange = {
  expenseId: string
  newCategoryId: string | null
}

export type PendingPaidToggle = {
  expense: Expense
  amountDisplay: string
  financialAccountId: string
}