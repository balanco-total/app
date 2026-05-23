'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

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
    <Modal open={true} onClose={onClose} size="md">
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
          <Input
            label="E-mail do convidado"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
            autoFocus
            maxLength={100}
            placeholder="email@exemplo.com"
          />
          <div className="flex gap-3">
            <Button
              type="submit"
              size="sm"
              isLoading={inviting}
              className="flex-1"
            >
              {inviting ? 'Gerando...' : 'Gerar link'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
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
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      )}
    </Modal>
  )
}