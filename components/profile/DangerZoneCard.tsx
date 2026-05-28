'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

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
    router.push('/')
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-red-100 dark:border-red-900/50">
        <h2 className="text-lg font-bold text-red-600 flex items-center gap-2 mb-4">
          <Trash2 size={20} />
          Zona de perigo
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Remove permanentemente <strong>todos os lançamentos</strong> da conta.
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="destructive"
            size="md"
            icon={<Trash2 size={18} />}
            onClick={() => { setShowDeleteModal(true); setDeleteConfirm(''); setDeleteMsg('') }}
            className="px-5 font-medium"
          >
            Excluir todos os lançamentos
          </Button>
          <button
            onClick={() => { setShowDeleteAccountModal(true); setDeleteAccountConfirm(''); setDeleteAccountMsg('') }}
            className="flex items-center gap-2 bg-red-900 text-white px-5 py-2.5 rounded-lg hover:bg-red-950 transition font-medium"
          >
            <Trash2 size={18} />
            Apagar conta permanentemente
          </button>
        </div>
      </div>

      <Modal
        open={showDeleteModal}
        onClose={deleteLoading ? () => {} : () => setShowDeleteModal(false)}
        size="md"
      >
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Excluir todos os lançamentos</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
          Esta ação é <strong>irreversível</strong> e removerá todos os lançamentos de todos os membros da conta.
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          Digite <strong className="text-red-600">EXCLUIR</strong> para confirmar:
        </p>
        <Input
          type="text"
          value={deleteConfirm}
          onChange={e => setDeleteConfirm(e.target.value)}
          placeholder="EXCLUIR"
          autoFocus
          className="mb-4 font-mono"
        />
        {deleteMsg && <p className="text-sm text-red-600 mb-3">{deleteMsg}</p>}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            size="md"
            onClick={confirmDeleteData}
            disabled={deleteConfirm !== 'EXCLUIR' || deleteLoading}
            isLoading={deleteLoading}
            className="flex-1"
          >
            {deleteLoading ? 'Excluindo...' : 'Confirmar exclusão'}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleteLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </Modal>

      <Modal
        open={showDeleteAccountModal}
        onClose={deleteAccountLoading ? () => {} : () => setShowDeleteAccountModal(false)}
        size="md"
      >
        <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Apagar conta permanentemente</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
          Esta ação é <strong>irreversível</strong> e irá remover:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside mb-4 space-y-1">
          <li>Todos os lançamentos</li>
          <li>Todas as categorias</li>
          <li>Todos os membros e seus acessos</li>
          <li>A conta inteira</li>
        </ul>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          Digite <strong className="text-red-700 dark:text-red-400">APAGAR CONTA</strong> para confirmar:
        </p>
        <Input
          type="text"
          value={deleteAccountConfirm}
          onChange={e => setDeleteAccountConfirm(e.target.value)}
          placeholder="APAGAR CONTA"
          autoFocus
          className="mb-4 font-mono"
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
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowDeleteAccountModal(false)}
            disabled={deleteAccountLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </Modal>
    </>
  )
}
