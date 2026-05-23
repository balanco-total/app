'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CreditCard, Zap, Users, BarChart2, Download, Trash2 } from 'lucide-react'
import Logo from './Logo'
import Button from './ui/Button'
import Card from './ui/Card'
import { daysRemaining } from '@/utils/billing'

type Profile = { id: string; name: string; account_id: string; role: string }
type Account = { id: string; trial_ends_at: string; subscription_status: string }

export default function BillingPage({ profile, account }: { profile: Profile; account: Account }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const days = daysRemaining(account.trial_ends_at)
  const isExpired = days === 0
  const isOwner = profile.role === 'owner'

  const handleSubscribe = async () => {
    if (!isOwner) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/billing/subscribe', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao iniciar assinatura.')
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      window.location.href = '/'
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Erro ao excluir conta.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card shadow="lg" padding="lg" className="max-w-md w-full">
        <div className="flex justify-center mb-6">
          <Logo height={40} width={130} />
        </div>

        {/* Status banner */}
        {isExpired ? (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-700">Período de teste encerrado</p>
              {isOwner
                ? <p className="text-sm text-red-600 mt-0.5">Assine para continuar usando o BalançoTotal.</p>
                : <p className="text-sm text-red-600 mt-0.5">Aguarde o responsável da conta assinar o plano.</p>
              }
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <AlertCircle size={20} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-700">
                {days === 1 ? 'Último dia de teste!' : `${days} dias restantes no período de teste`}
              </p>
              {isOwner
                ? <p className="text-sm text-amber-600 mt-0.5">Assine agora para não perder o acesso.</p>
                : <p className="text-sm text-amber-600 mt-0.5">O responsável da conta pode assinar o plano.</p>
              }
            </div>
          </div>
        )}

        {/* Plan card */}
        <div className="border-2 border-emerald-500 rounded-xl p-5 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Plano Mensal</h2>
              <p className="text-sm text-gray-500">Acesso completo para toda a conta</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-emerald-600">R$ 7,99</span>
              <span className="text-sm text-gray-400">/mês</span>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            {[
              [Zap, 'Lançamentos ilimitados'],
              [Users, 'Múltiplos usuários na conta'],
              [BarChart2, 'Gráficos e relatórios'],
              [Download, 'Importação CSV e OFX'],
            ].map(([Icon, label]) => (
              <li key={label as string} className="flex items-center gap-2">
                <span className="text-emerald-500"><Icon size={16} /></span>
                {label as string}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
            {error}
          </p>
        )}

        {isOwner ? (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition disabled:opacity-60"
          >
            <CreditCard size={18} />
            {loading ? 'Redirecionando...' : 'Assinar agora'}
          </button>
        ) : (
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 font-semibold py-3 rounded-xl cursor-not-allowed"
          >
            Somente o responsável pode assinar
          </button>
        )}

        <button
          onClick={() => router.push('/app')}
          className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition py-2"
        >
          Voltar ao painel
        </button>

        {/* Delete account — shown only when trial expired, owner only */}
        {isExpired && isOwner && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-3">
                {deleteError}
              </p>
            )}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 transition py-1"
              >
                <Trash2 size={14} />
                Excluir conta permanentemente
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-700 mb-1">Excluir conta permanentemente?</p>
                <p className="text-sm text-red-600 mb-4">
                  Todos os dados (despesas, categorias, usuários) serão apagados e não poderão ser recuperados.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAccount}
                    isLoading={deleting}
                    className="flex-1 text-sm"
                  >
                    {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="flex-1 text-sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
