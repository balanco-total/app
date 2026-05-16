export type Profile = { id: string; name: string; account_id: string; role: string }

export type Invoice = {
  id: string
  amount: number
  currency: string
  status: string | null
  created: number
  period_start: number
  period_end: number
  hosted_invoice_url: string | null
}

export type BillingData = {
  invoices: Invoice[]
  status: string
  trialEndsAt: string
  subscriptionId: string | null
  nextBillingDate: number | null
  cancelAtPeriodEnd: boolean
}
