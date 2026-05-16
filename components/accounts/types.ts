export type Profile = { id: string; name: string; account_id: string; role: string }
export type Account = { id: string; trial_ends_at: string; subscription_status: string } | null
export type FinancialAccount = {
  id: string
  account_id: string
  name: string
  description: string | null
  balance: number
  is_default: boolean
  created_at: string
}
