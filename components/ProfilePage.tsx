'use client'

import { useToast, Toasts } from './toast'
import BillingBanner from './BillingBanner'
import DashboardHeader from './dashboard/DashboardHeader'
import PersonalInfoCard from './profile/PersonalInfoCard'
import ExportCard from './profile/ExportCard'
import BankConnectionsCard from './profile/BankConnectionsCard'
import ImportCard from './profile/ImportCard'
import DangerZoneCard from './profile/DangerZoneCard'
import type { Profile, Account } from './profile/types'

export default function ProfilePage({ profile, email, account }: { profile: Profile; email: string; account: Account }) {
  const { toasts, toast, dismiss } = useToast()

  return (
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
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-800">Perfil</h1>
            <p className="text-gray-500 text-sm mt-0.5">{email}</p>
          </div>
          <PersonalInfoCard profile={profile} email={email} />
          <ExportCard accountId={profile.account_id} toast={toast} />
          <BankConnectionsCard role={profile.role} toast={toast} />
          <ImportCard />
          {profile.role === 'owner' && <DangerZoneCard />}
        </div>
        <Toasts toasts={toasts} dismiss={dismiss} />
      </div>
    </div>
  )
}
