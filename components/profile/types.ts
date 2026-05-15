export type Profile = { id: string; name: string; account_id: string; role: string }
export type Account = { id: string; trial_ends_at: string; subscription_status: string } | null

export type ParsedRow = {
  description: string
  amount: number
  category_name: string
  date: string
  raw_date: string
  paid_at?: string
  account_name?: string
}

export type BankConnection = {
  id: string
  item_id: string
  connector_name: string | null
  connector_logo: string | null
  last_synced_at: string | null
  created_at: string
}

export type ToastApi = {
  error: (msg: string) => void
  success: (msg: string) => void
  warn: (msg: string) => void
}

declare global {
  interface Window {
    PluggyConnect: new (opts: {
      connectToken: string
      onSuccess: (data: { item: { id: string; connector: { name: string; logoImageUrl: string } } }) => void
      onError?: (err: unknown) => void
      onClose?: () => void
    }) => { init(): void }
  }
}
