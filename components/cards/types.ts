export type Profile = { id: string; name: string; account_id: string; role: string }
export type Account = { id: string; trial_ends_at: string; subscription_status: string } | null

export type CreditCard = {
  id: string
  account_id: string
  description: string
  credit_limit: number
  closing_day: number
  due_day: number
  created_at: string
}

/** Card augmented with the used-limit (sum of unpaid invoice totals). */
export type CreditCardWithUsage = CreditCard & { used: number }

export type InvoiceStatus = 'open' | 'closed' | 'paid'

export type CreditCardInvoice = {
  id: string
  account_id: string
  credit_card_id: string
  reference_month: string
  closing_date: string
  due_date: string
  status: InvoiceStatus
  total: number
  paid_at: string | null
  paid_from_account_id: string | null
  created_at: string
}

export type InvoiceExpense = {
  id: string
  user_id: string
  description: string
  amount: number
  category_id: string | null
  date: string
  credit_card_invoice_id: string | null
}

export type BankAccountOption = { id: string; name: string; is_default: boolean }
