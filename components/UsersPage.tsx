'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, UserPlus, Copy, Check, Clock, Users, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Profile = { id: string; name: string; account_id: string; role: string; created_at: string }
type Invite = {
  id: string
  token: string
  email: string
  used_at: string | null
  expires_at: string
  created_at: string
}

export default function UsersPage({ profile }: { profile: Profile }) {
  const supabase = createClient()

  const [members, setMembers] = useState<Profile[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, account_id, role, created_at')
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

  const openModal = () => {
    setInviteEmail('')
    setInviteLink('')
    setError('')
    setShowModal(true)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (inviteEmail.trim().length > 100) {
      setError('E-mail deve ter no máximo 100 caracteres.')
      return
    }

    setInviting(true)

    const { data: token, error: rpcError } = await supabase.rpc('create_invite', {
      p_email: inviteEmail.trim(),
    })

    if (rpcError || !token) {
      setError('Erro ao gerar convite. Verifique o e-mail e tente novamente.')
      setInviting(false)
      return
    }

    const link = `${window.location.origin}/invite?token=${token}`
    setInviteLink(link)
    setInviting(false)
    await loadData()
  }

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const revokeInvite = async (invite: Invite) => {
    if (!confirm(`Revogar convite para ${invite.email}?`)) return
    await supabase.from('invites').delete().eq('id', invite.id)
    setInvites(invites.filter(i => i.id !== invite.id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
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
              onClick={openModal}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <UserPlus size={18} />
              Convidar
            </button>
          </div>
        </div>

        {/* Members list */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            Membros
          </h2>
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{m.name}</p>
                  <p className="text-sm text-gray-500">
                    {m.role === 'owner' ? 'Proprietário' : 'Membro'} •{' '}
                    desde {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {m.id === profile.id && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                    Você
                  </span>
                )}
              </div>
            ))}
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
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-1">Convidar usuário</h3>
            <p className="text-gray-500 text-sm mb-6">
              O convidado terá acesso aos mesmos dados da sua conta.
            </p>

            {!inviteLink ? (
              <form onSubmit={handleInvite} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {inviting ? 'Gerando...' : 'Gerar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Copie e envie este link para o convidado:
                </p>
                <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="flex-1 text-xs text-gray-700 break-all">{inviteLink}</span>
                  <button
                    onClick={() => copyLink(inviteLink)}
                    className="text-blue-600 hover:text-blue-800 transition shrink-0 mt-0.5"
                    title="Copiar link"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
