'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelSubscription() {
  const router = useRouter()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const handleCancel = async () => {
    setCanceling(true)
    setCancelError('')
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido')
      router.push('/billing')
    } catch (e: unknown) {
      setCancelError(e instanceof Error ? e.message : 'Erro ao cancelar.')
      setCanceling(false)
      setConfirmCancel(false)
    }
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
      {cancelError && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-100 border border-red-200 rounded-lg px-4 py-2 mb-3">
          {cancelError}
        </p>
      )}
      {!confirmCancel ? (
        <button
          onClick={() => setConfirmCancel(true)}
          className="text-sm text-red-500 hover:text-red-700 transition"
        >
          Cancelar assinatura
        </button>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Tem certeza?</p>
          <p className="text-sm text-red-600 mb-4">
            Ao cancelar, você perderá acesso ao BalançoTotal imediatamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-red-700 transition disabled:opacity-60"
            >
              {canceling ? 'Cancelando...' : 'Confirmar cancelamento'}
            </button>
            <button
              onClick={() => setConfirmCancel(false)}
              disabled={canceling}
              className="flex-1 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
