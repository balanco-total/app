'use client'

import { Clock, Copy, Trash2 } from 'lucide-react'
import type { Invite } from './types'

type Props = {
  invites: Invite[]
  onCopyLink: (token: string) => void
  onRevoke: (invite: Invite) => void
}

export default function PendingInvites({ invites, onCopyLink, onRevoke }: Props) {
  if (invites.length === 0) return null

  return (
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
                onClick={() => onCopyLink(invite.token)}
                className="text-gray-400 hover:text-gray-600 transition"
                title="Copiar link"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => onRevoke(invite)}
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
  )
}