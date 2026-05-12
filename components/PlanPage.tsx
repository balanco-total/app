'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, ExternalLink, AlertTriangle, CheckCircle2, Clock, XCircle, Receipt } from 'lucide-react'
import Link from 'next/link'
import Logo from './Logo'

type Profile = { id: string; name: string; account_id: string; role: string }

type Invoice = {
  id: string
  amount: number
  currency: string
  status: string | null
  created: number
  period_start: number
  period_end: number
  hosted_invoice_url: string | null
}

type BillingData = {
  invoices: Invoice[]
  status: string
  trialEndsAt: string
  subscriptionId: string | null
  nextBillingDate: number | null
  cancelAtPeriodEnd: boolean
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('pt-BR')
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusLabel(status: string | null) {
  switch (status) {
    case 'paid': return { label: 'Pago', color: 'text-emerald-600 bg-emerald-50' }
    case 'open': return { label: 'Em aberto', color: 'text-amber-600 bg-amber-50' }
    case 'void': return { label: 'Cancelada', color: 'text-gray-500 bg-gray-100' }
    case 'uncollectible': return { label: 'Não cobrada', color: 'text-red-600 bg-red-50' }
    default: return { label: status ?? '—', color: 'text-gray-500 bg-gray-100' }
  }
}

function subscriptionStatusLabel(status: string) {
  switch (status) {
    case 'active': return { label: 'Ativa', icon: CheckCircle2, color: 'text-emerald-600' }
    case 'trialing': return { label: 'Período de teste', icon: Clock, color: 'text-amber-600' }
    case 'past_due': return { label: 'Pagamento pendente', icon: AlertTriangle, color: 'text-red-600' }
    case 'canceled': return { label: 'Cancelada', icon: XCircle, color: 'text-gray-500' }
    default: return { label: status, icon: Clock, color: 'text-gray-500' }
  }
}

export default function PlanPage({ profile }: { profile: Profile }) {
  const router = useRouter()
  const isOwner = profile.role === 'owner'

  const [data, setData] = useState<BillingData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [canceling, setCanceling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    fetch('/api/billing/invoices')
      .then(r => r.json())
      .then(d => {
        if (d.error) setLoadError(d.error)
        else setData(d)
      })
      .catch(() => setLoadError('Erro ao carregar dados de cobrança.'))
  }, [])

  const handleCancel = async () => {
    setCanceling(true)
    setCancelError('')
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido')
      router.push('/app/billing')
    } catch (e: unknown) {
      setCancelError(e instanceof Error ? e.message : 'Erro ao cancelar.')
      setCanceling(false)
      setConfirmCancel(false)
    }
  }

  const statusInfo = data ? subscriptionStatusLabel(data.status) : null
  const StatusIcon = statusInfo?.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 pt-4">
          <Logo height={36} width={120} />
          <Link
            href="/app"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            <ArrowLeft size={16} />
            Voltar ao painel
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <h1 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
            <CreditCard size={22} className="text-emerald-600" />
            Meu Plano
          </h1>

          {loadError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
              {loadError}
            </p>
          )}

          {!data && !loadError && (
            <div className="py-8 text-center text-gray-400 text-sm">Carregando...</div>
          )}

          {data && (
            <>
              {/* Plan summary */}
              <div className="border border-gray-100 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Plano atual</p>
                  <p className="font-semibold text-gray-800">Plano Mensal — R$ 7,99/mês</p>
                </div>
                <div className="flex flex-col sm:items-end gap-1">
                  {statusInfo && StatusIcon && (
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${statusInfo.color}`}>
                      <StatusIcon size={15} />
                      {statusInfo.label}
                    </span>
                  )}
                  {data.status === 'active' && data.nextBillingDate && !data.cancelAtPeriodEnd && (
                    <p className="text-xs text-gray-400">
                      Próxima cobrança: {formatDate(data.nextBillingDate)}
                    </p>
                  )}
                  {data.cancelAtPeriodEnd && data.nextBillingDate && (
                    <p className="text-xs text-amber-600">
                      Cancela em: {formatDate(data.nextBillingDate)}
                    </p>
                  )}
                  {data.status === 'trialing' && (
                    <p className="text-xs text-gray-400">
                      Teste encerra em: {new Date(data.trialEndsAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              {/* Invoices table */}
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                  <Receipt size={15} />
                  Histórico de cobranças
                </h2>

                {data.invoices.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">
                    Nenhuma cobrança registrada ainda.
                  </p>
                ) : (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Período</th>
                          <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Valor</th>
                          <th className="text-center px-4 py-2.5 text-gray-500 font-medium">Status</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {data.invoices.map((inv, i) => {
                          const s = statusLabel(inv.status)
                          return (
                            <tr key={inv.id} className={i > 0 ? 'border-t border-gray-50' : ''}>
                              <td className="px-4 py-3 text-gray-700">
                                {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-800">
                                {formatCurrency(inv.amount)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                                  {s.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {inv.hosted_invoice_url && (
                                  <a
                                    href={inv.hosted_invoice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                                  >
                                    Ver <ExternalLink size={12} />
                                  </a>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Cancel subscription */}
              {isOwner && data.status === 'active' && !data.cancelAtPeriodEnd && (
                <div className="border-t border-gray-100 pt-5">
                  {cancelError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-3">
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
                      <div className="flex gap-3">
                        <button
                          onClick={handleCancel}
                          disabled={canceling}
                          className="flex-1 bg-red-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-60"
                        >
                          {canceling ? 'Cancelando...' : 'Confirmar cancelamento'}
                        </button>
                        <button
                          onClick={() => setConfirmCancel(false)}
                          disabled={canceling}
                          className="flex-1 bg-gray-100 text-gray-700 text-sm font-semibold py-2 rounded-lg hover:bg-gray-200 transition"
                        >
                          Voltar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
