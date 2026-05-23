'use client'

import { Users, UserX, UserCheck, Trash2 } from 'lucide-react'
import type { UserProfile } from './types'

type Props = {
  members: UserProfile[]
  currentUserId: string
  actionLoading: string | null
  onToggleDisable: (member: UserProfile) => void
  onDelete: (member: UserProfile) => void
}

export default function MembersList({
  members,
  currentUserId,
  actionLoading,
  onToggleDisable,
  onDelete,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Users size={20} className="text-brand-500" />
        Membros
      </h2>

      <div className="space-y-3">
        {members.map(m => {
          const isSelf = m.id === currentUserId
          const isOwner = m.role === 'owner'
          const isLoading = actionLoading === m.id

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
                      onClick={() => onToggleDisable(m)}
                      disabled={isLoading}
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
                      onClick={() => onDelete(m)}
                      disabled={isLoading}
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
  )
}