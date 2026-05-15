'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function DangerZoneCard() {
  const supabase = createClient()
  const router = useRouter()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('')
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [deleteAccountMsg, setDeleteAccountMsg] = useState('')

  const confirmDeleteData = async () => {
    if (deleteConfirm !== 'EXCLUIR') return
    setDeleteLoading(true)
    setDeleteMsg('')
    const res = await fetch('/api/profile/data', { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) {
      setDeleteMsg(json.error ?? 'Erro ao excluir os dados.')
      setDeleteLoading(false)
      return
    }
    setShowDeleteModal(false)
    setDeleteConfirm('')
    setDeleteLoading(false)
    router.push('/app')
    router.refresh()
  }

  const confirmDeleteAccount = async () => {
    if (deleteAccountConfirm !== 'APAGAR CONTA') return
    setDeleteAccountLoading(true)
    setDeleteAccountMsg('')
    const res = await fetch('/api/profile/account', { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) {
      setDeleteAccountMsg(json.error ?? 'Erro ao apagar a conta.')
      setDeleteAccountLoading(false)
      return
    }
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-100">
        <h2 className="text-lg font-bold text-red-600 flex items-center gap-2 mb-4">
          <Trash2 size={20} />
          Zona de perigo
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Remove permanentemente <strong>todos os lançamentos</strong> da conta.
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteConfirm(''); setDeleteMsg('') }}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition font-medium"
          >
            <Trash2 size={18} />
            Excluir todos os lançamentos
          </button>
          <button
            onClick={() => { setShowDeleteAccountModal(true); setDeleteAccountConfirm(''); setDeleteAccountMsg('') }}
            className="flex items-center gap-2 bg-red-900 text-white px-5 py-2.5 rounded-lg hover:bg-red-950 transition font-medium"
          >
            <Trash2 size={18} />
            Apagar conta permanentemente
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Excluir todos os lançamentos</h3>
            <p className="text-gray-600 text-sm mb-4">
              Esta ação é <strong>irreversível</strong> e removerá todos os lançamentos de todos os membros da conta.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              Digite <strong className="text-red-600">EXCLUIR</strong> para confirmar:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4 font-mono"
              placeholder="EXCLUIR"
              autoFocus
            />
            {deleteMsg && <p className="text-sm text-red-600 mb-3">{deleteMsg}</p>}
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteData}
                disabled={deleteConfirm !== 'EXCLUIR' || deleteLoading}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-40"
              >
                {deleteLoading ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-700 mb-2">Apagar conta permanentemente</h3>
            <p className="text-gray-600 text-sm mb-2">
              Esta ação é <strong>irreversível</strong> e irá remover:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
              <li>Todos os lançamentos</li>
              <li>Todas as categorias</li>
              <li>Todos os membros e seus acessos</li>
              <li>A conta inteira</li>
            </ul>
            <p className="text-sm text-gray-700 mb-2">
              Digite <strong className="text-red-700">APAGAR CONTA</strong> para confirmar:
            </p>
            <input
              type="text"
              value={deleteAccountConfirm}
              onChange={e => setDeleteAccountConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4 font-mono"
              placeholder="APAGAR CONTA"
              autoFocus
            />
            {deleteAccountMsg && <p className="text-sm text-red-600 mb-3">{deleteAccountMsg}</p>}
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteAccount}
                disabled={deleteAccountConfirm !== 'APAGAR CONTA' || deleteAccountLoading}
                className="flex-1 bg-red-900 text-white py-2.5 rounded-lg font-semibold hover:bg-red-950 transition disabled:opacity-40"
              >
                {deleteAccountLoading ? 'Apagando...' : 'Apagar conta'}
              </button>
              <button
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={deleteAccountLoading}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
