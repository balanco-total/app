'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { UserPlus } from 'lucide-react'
import { useToast, Toasts, useConfirm, ConfirmModal } from './toast'
import LoadingPage from './LoadingPage'
import BillingBanner from './BillingBanner'
import Button from './ui/Button'

// Reused from dashboard
import DashboardHeader from './dashboard/DashboardHeader'

// Users sub-components
import MembersList from './users/MembersList'
import PendingInvites from './users/PendingInvites'
import InviteModal from './users/InviteModal'
import DeleteModal from './users/DeleteModal'

import type { UserProfile, Account, Invite, DeleteTarget } from './users/types'

export default function UsersPage({
  profile,
  account,
}: {
  profile: UserProfile
  account: Account
}) {
  const supabase = createClient()

  // ── Data ───────────────────────────────────
  const [members, setMembers] = useState<UserProfile[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  // ── UI state ───────────────────────────────
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const { toasts, toast, dismiss } = useToast()
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  // ── Data fetching ──────────────────────────

  const loadData = async () => {
    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, account_id, role, created_at, is_disabled')
        .eq('account_id', profile.account_id)
        .order('created_at'),
      supabase
        .from('invites')
        .select('*')
        .eq('account_id', profile.account_id)
        .is('used_at', null)
        .order('created_at', { ascending: false }),
    ])
    setMembers(membersRes.data ?? [])
    setInvites((invitesRes.data ?? []).filter(i => new Date(i.expires_at) > new Date()))
    setLoading(false)
  }

  // ── Handlers ───────────────────────────────

  /** Called by InviteModal — returns the token or null on error */
  const generateInviteLink = async (email: string): Promise<string | null> => {
    const { data: token, error } = await supabase.rpc('create_invite', { p_email: email })
    return error || !token ? null : token
  }

  const handleCopyLink = async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/invite?token=${token}`)
  }

  const revokeInvite = (invite: Invite) => {
    showConfirm({
      title: 'Revogar convite?',
      body: `O convite para ${invite.email} será cancelado.`,
      confirmLabel: 'Revogar',
      onConfirm: async () => {
        await supabase.from('invites').delete().eq('id', invite.id)
        setInvites(prev => prev.filter(i => i.id !== invite.id))
      },
    })
  }

  const openDeleteModal = async (member: UserProfile) => {
    setActionLoading(member.id)
    const { count } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', member.id)
    setDeleteTarget({ member, expenseCount: count ?? 0 })
    setActionLoading(null)
  }

  const confirmDelete = async (migrate: boolean) => {
    if (!deleteTarget) return
    setDeleteLoading(true)

    const res = await fetch(`/api/users/${deleteTarget.member.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ migrate }),
    })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error ?? 'Erro ao excluir membro.')
      setDeleteLoading(false)
      return
    }

    setMembers(prev => prev.filter(m => m.id !== deleteTarget.member.id))
    setDeleteTarget(null)
    setDeleteLoading(false)
  }

  const handleToggleDisable = (member: UserProfile) => {
    const action = member.is_disabled ? 'Habilitar' : 'Desabilitar'
    const detail = member.is_disabled
      ? `${member.name} voltará a ter acesso à conta.`
      : `${member.name} será desconectado imediatamente e não poderá mais fazer login.`

    showConfirm({
      title: `${action} ${member.name}?`,
      body: detail,
      confirmLabel: action,
      onConfirm: async () => {
        setActionLoading(member.id)
        const res = await fetch(`/api/users/${member.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disabled: !member.is_disabled }),
        })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error ?? 'Erro ao atualizar membro.')
          setActionLoading(null)
          return
        }
        setMembers(prev =>
          prev.map(m => m.id === member.id ? { ...m, is_disabled: !m.is_disabled } : m)
        )
        setActionLoading(null)
      },
    })
  }

  // ── Loading ────────────────────────────────

  if (loading) return <LoadingPage />

  // ── Render ─────────────────────────────────

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">

        <DashboardHeader profile={profile} />

        {account && (
          <BillingBanner
            subscriptionStatus={account.subscription_status}
            trialEndsAt={account.trial_ends_at}
            isOwner={profile.role === 'owner'}
          />
        )}

        {/* Page bar: member count + invite button */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
              {members.length} membro(s) na conta
            </p>
            <Button
              size="sm"
              icon={<UserPlus size={18} />}
              onClick={() => setShowInviteModal(true)}
              className="px-4 shrink-0"
            >
              <span>Convidar</span>
            </Button>
          </div>
        </div>

        <MembersList
          members={members}
          currentUserId={profile.id}
          actionLoading={actionLoading}
          onToggleDisable={handleToggleDisable}
          onDelete={openDeleteModal}
        />

        <PendingInvites
          invites={invites}
          onCopyLink={handleCopyLink}
          onRevoke={revokeInvite}
        />
      </div>

      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onGenerateLink={generateInviteLink}
          onInvited={loadData}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <ConfirmModal {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  )
}