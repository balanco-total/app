'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, UserPlus, Copy, Check, Clock, Users, Trash2, UserX, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { useToast, Toasts, useConfirm, ConfirmModal } from './toast'
import Logo from './Logo'

type Profile = {
  id: string
  name: string
  account_id: string
  role: string
  created_at: string
  is_disabled: boolean
}
type Invite = {
  id: string
  token: string
  email: string
  used_at: string | null
  expires_at: string
  created_at: string
}
type DeleteTarget = { member: Profile; expenseCount: number }

export default function UsersPage({ profile }: { profile: Profile }) {
  const supabase = createClient()

  const [members, setMembers] = useState<Profile[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copied, setCopied] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const { toasts, toast, dismiss } = useToast()
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()

  useEffect(() => { loadData() }, [])

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

  const openInviteModal = () => {
    setInviteEmail('')
    setInviteLink('')
    setInviteError('')
    setShowInviteModal(true)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError('')

    if (inviteEmail.trim().length > 100) {
      setInviteError('E-mail deve ter no máximo 100 caracteres.')
      return
    }

    setInviting(true)
    const { data: token, error: rpcError } = await supabase.rpc('create_invite', {
      p_email: inviteEmail.trim(),
    })

    if (rpcError || !token) {
      setInviteError('Erro ao gerar convite. Verifique o e-mail e tente novamente.')
      setInviting(false)
      return
    }

    setInviteLink(`${window.location.origin}/invite?token=${token}`)
    setInviting(false)
    await loadData()
  }

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  const openDeleteModal = async (member: Profile) => {
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

    setMembers(members.filter(m => m.id !== deleteTarget.member.id))
    setDeleteTarget(null)
    setDeleteLoading(false)
  }

  const handleToggleDisable = async (member: Profile) => {
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
        setMembers(prev => prev.map(m =>
          m.id === member.id ? { ...m, is_disabled: !m.is_disabled } : m
        ))
        setActionLoading(null)
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center">
        <Logo />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 p-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-500 hover:text-gray-700 transition">
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
                <p className="text-gray-500 text-sm">{members.length} membro(s) na conta</p>
              </div>
            </div>
            <button
              onClick={openInviteModal}
              className="flex items-center gap-2 bg-[#1B4332] text-white px-4 py-2 rounded-lg hover:bg-[#163a2b] transition"
            >
              <UserPlus size={18} />
              Convidar
            </button>
          </div>
        </div>

        {/* Members list */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={20} className="text-[#1B4332]" />
            Membros
          </h2>
          <div className="space-y-3">
            {members.map(m => {
              const isSelf = m.id === profile.id
              const isOwner = m.role === 'owner'
              const loading = actionLoading === m.id

              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    m.is_disabled ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${m.is_disabled ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {m.name}
                      </p>
                      {m.is_disabled && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                          Desabilitado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {isOwner ? 'Proprietário' : 'Membro'} •{' '}
                      desde {new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelf && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                        Você
                      </span>
                    )}
                    {!isSelf && !isOwner && (
                      <>
                        <button
                          onClick={() => handleToggleDisable(m)}
                          disabled={loading}
                          title={m.is_disabled ? 'Habilitar membro' : 'Desabilitar membro'}
                          className={`p-2 rounded-lg transition disabled:opacity-40 ${
                            m.is_disabled
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-yellow-600 hover:bg-yellow-50'
                          }`}
                        >
                          {m.is_disabled ? <UserCheck size={18} /> : <UserX size={18} />}
                        </button>
                        <button
                          onClick={() => openDeleteModal(m)}
                          disabled={loading}
                          title="Excluir membro"
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-yellow-500" />
              Convites pendentes
            </h2>
            <div className="space-y-3">
              {invites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyLink(`${window.location.origin}/invite?token=${invite.token}`)}
                      className="text-gray-400 hover:text-gray-600 transition"
                      title="Copiar link"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => revokeInvite(invite)}
                      className="text-red-400 hover:text-red-600 transition"
                      title="Revogar convite"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-1">Convidar usuário</h3>
            <p className="text-gray-500 text-sm mb-6">
              O convidado terá acesso aos mesmos dados da sua conta.
            </p>

            {!inviteLink ? (
              <form onSubmit={handleInvite} className="space-y-4">
                {inviteError && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{inviteError}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail do convidado
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    required
                    autoFocus
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex-1 bg-[#1B4332] text-white py-2 rounded-lg font-semibold hover:bg-[#163a2b] transition disabled:opacity-50"
                  >
                    {inviting ? 'Gerando...' : 'Gerar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Copie e envie este link para o convidado:</p>
                <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="flex-1 text-xs text-gray-700 break-all">{inviteLink}</span>
                  <button
                    onClick={() => copyLink(inviteLink)}
                    className="text-red-600 hover:text-red-800 transition shrink-0 mt-0.5"
                    title="Copiar link"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Excluir {deleteTarget.member.name}
            </h3>

            {deleteTarget.expenseCount > 0 ? (
              <>
                <p className="text-gray-600 text-sm mb-6">
                  Este membro possui{' '}
                  <strong>{deleteTarget.expenseCount} lançamento(s)</strong>.
                  O que deseja fazer com eles?
                </p>
                <div className="space-y-3 mb-4">
                  <button
                    onClick={() => confirmDelete(true)}
                    disabled={deleteLoading}
                    className="w-full text-left p-4 border-2 border-red-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition disabled:opacity-40"
                  >
                    <p className="font-semibold text-red-700">Migrar lançamentos para mim</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Os lançamentos ficam na conta, transferidos para o proprietário.
                    </p>
                  </button>
                  <button
                    onClick={() => confirmDelete(false)}
                    disabled={deleteLoading}
                    className="w-full text-left p-4 border-2 border-red-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition disabled:opacity-40"
                  >
                    <p className="font-semibold text-red-700">Excluir com os lançamentos</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      O membro e todos os seus lançamentos serão removidos permanentemente.
                    </p>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-sm mb-6">
                  Este membro não possui lançamentos. Deseja excluí-lo permanentemente?
                </p>
                <button
                  onClick={() => confirmDelete(false)}
                  disabled={deleteLoading}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 mb-3"
                >
                  {deleteLoading ? 'Excluindo...' : 'Excluir membro'}
                </button>
              </>
            )}

            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ConfirmModal {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
