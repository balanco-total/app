export type UserProfile = {
  id: string
  name: string
  account_id: string
  role: string
  created_at: string
  is_disabled: boolean
}

export type Account = { id: string; trial_ends_at: string; subscription_status: string } | null

export type Invite = {
  id: string
  token: string
  email: string
  used_at: string | null
  expires_at: string
  created_at: string
}

export type DeleteTarget = {
  member: UserProfile
  expenseCount: number
}