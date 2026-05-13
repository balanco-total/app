'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

type Props = {
  onClose: () => void
  onGenerateLink: (email: string) => Promise<string | null>
  onInvited: () => void
}

export default function InviteModal({ onClose, onGenerateLink, onInvited }: Props) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError('')

    if (inviteEmail.trim().length > 100) {
      setInviteError('E-mail deve ter no máximo 100 caracteres.')
      return
    }

    setInviting(true)
    const token = await onGenerateLink(inviteEmail.trim())

    if (!token) {
      setInviteError('Erro ao gerar convite. Verifique o e-mail e tente novamente.')
      setInviting(false)
      return
    }

    setInviteLink(`${window.location.origin}/invite?token=${token}`)
    setInviting(false)
    onInvited()
  }

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-gray-800 mb-1">Convidar usuário</h3>
        <p className="text-gray-500 text-sm mb-6">
          O convidado terá acesso aos mesmos dados da sua conta.
        </p>

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {inviteError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {inviteError}
              </div>
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
                onClick={onClose}
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
              onClick={onClose}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}