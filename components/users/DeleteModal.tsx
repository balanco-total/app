'use client'

import type { DeleteTarget } from './types'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

type Props = {
  target: DeleteTarget
  loading: boolean
  onConfirm: (migrate: boolean) => void
  onClose: () => void
}

export default function DeleteModal({ target, loading, onConfirm, onClose }: Props) {
  const { member, expenseCount } = target

  return (
    <Modal open={true} onClose={loading ? () => {} : onClose} size="md">
      <h3 className="text-xl font-bold text-gray-800 mb-2">
        Excluir {member.name}
      </h3>

      {expenseCount > 0 ? (
        <>
          <p className="text-gray-600 text-sm mb-6">
            Este membro possui{' '}
            <strong>{expenseCount} lançamento(s)</strong>.
            O que deseja fazer com eles?
          </p>
          <div className="space-y-3 mb-4">
            <button
              onClick={() => onConfirm(true)}
              disabled={loading}
              className="w-full text-left p-4 border-2 border-red-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition disabled:opacity-40"
            >
              <p className="font-semibold text-red-700">Migrar lançamentos para mim</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Os lançamentos ficam na conta, transferidos para o proprietário.
              </p>
            </button>
            <button
              onClick={() => onConfirm(false)}
              disabled={loading}
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
          <Button
            variant="destructive"
            size="lg"
            fullWidth
            isLoading={loading}
            onClick={() => onConfirm(false)}
            className="mb-3"
          >
            {loading ? 'Excluindo...' : 'Excluir membro'}
          </Button>
        </>
      )}

      <Button
        variant="secondary"
        size="sm"
        fullWidth
        disabled={loading}
        onClick={onClose}
      >
        Cancelar
      </Button>
    </Modal>
  )
}