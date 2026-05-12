'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CreditCard, Zap, Users, BarChart2, Download } from 'lucide-react'
import Logo from './Logo'

type Profile = { id: string; name: string; account_id: string; role: string }
type Account = { id: string; trial_ends_at: string; subscription_status: string }

function daysRemaining(trialEndsAt: string): number {
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function BillingPage({ profile, account }: { profile: Profile; account: Account }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
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
      </div>
    </div>
  )
}
