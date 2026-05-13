'use client'

import type { DeleteTarget } from './types'

type Props = {
  target: DeleteTarget
  loading: boolean
  onConfirm: (migrate: boolean) => void
  onClose: () => void
}

export default function DeleteModal({ target, loading, onConfirm, onClose }: Props) {
  const { member, expenseCount } = target

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
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
            <button
              onClick={() => onConfirm(false)}
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 mb-3"
            >
              {loading ? 'Excluindo...' : 'Excluir membro'}
            </button>
          </>
        )}

        <button
          onClick={onClose}
          disabled={loading}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}