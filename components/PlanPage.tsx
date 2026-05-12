'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, ExternalLink, AlertTriangle, CheckCircle2, Clock, XCircle, Receipt, Users, LogOut, User as UserIcon, PieChart } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
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

const AVATAR_COLORS = ['#3b82f6','#22c55e','#a855f7','#f97316','#ef4444','#14b8a6','#6366f1','#ec4899']

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function getAvatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
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
    case 'active': return { label: 'Ativo', icon: CheckCircle2, color: 'text-emerald-600' }
    case 'trialing': return { label: 'Período de teste', icon: Clock, color: 'text-amber-600' }
    case 'past_due': return { label: 'Pagamento pendente', icon: AlertTriangle, color: 'text-red-600' }
    case 'canceled': return { label: 'Cancelado', icon: XCircle, color: 'text-gray-500' }
    default: return { label: status, icon: Clock, color: 'text-gray-500' }
  }
}

export default function PlanPage({ profile, memberCount }: { profile: Profile; memberCount: number }) {
  const supabase = createClient()
  const router = useRouter()
  const isOwner = profile.role === 'owner'

  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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
      <div className="max-w-7xl mx-auto">

        {/* Header — identical to Dashboard */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <Link href="/app"><Logo height={40} width={130} /></Link>
            <div className="flex items-center gap-3">
              <Link
                href="/app/charts"
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                title="Ver gráficos"
              >
                <PieChart size={20} className="text-gray-600" />
                <span className="text-gray-700 font-medium">Gráficos</span>
              </Link>
              {isOwner ? (
                <Link
                  href="/app/users"
                  className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                  <Users size={20} className="text-gray-600" />
                  <span className="text-gray-700 font-medium">{memberCount} usuário(s)</span>
                </Link>
              ) : (
                <div className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                  <Users size={20} className="text-gray-600" />
                  <span className="text-gray-700 font-medium">{memberCount} usuário(s)</span>
                </div>
              )}

              {/* Avatar dropdown */}
              <div className="relative" ref={avatarRef}>
                <button
                  onClick={() => setShowAvatarMenu(v => !v)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow hover:opacity-90 transition"
                  style={{ backgroundColor: getAvatarColor(profile.name) }}
                  title={profile.name}
                >
                  {getInitials(profile.name)}
                </button>
                {showAvatarMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      href="/app/profile"
                      onClick={() => setShowAvatarMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition text-sm"
                    >
                      <UserIcon size={16} className="text-gray-400" />
                      {profile.name}
                    </Link>
                    <Link
                      href="/app/plan"
                      onClick={() => setShowAvatarMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition text-sm"
                    >
                      <CreditCard size={16} className="text-gray-400" />
                      Meu plano
                    </Link>
                    {isOwner ? (
                      <Link
                        href="/app/users"
                        onClick={() => setShowAvatarMenu(false)}
                        className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition text-sm"
                      >
                        <Users size={16} className="text-gray-400" />
                        {memberCount} usuário(s)
                      </Link>
                    ) : (
                      <div className="sm:hidden flex items-center gap-3 px-4 py-2.5 text-gray-500 text-sm">
                        <Users size={16} className="text-gray-400" />
                        {memberCount} usuário(s)
                      </div>
                    )}
                    <hr className="border-gray-100" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition text-sm"
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
              <CreditCard size={20} className="text-emerald-600 shrink-0" />
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
                <div className="border border-gray-100 rounded-xl p-4 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Plano atual</p>
                      <p className="font-semibold text-gray-800">Plano Mensal — R$ 7,99/mês</p>
                    </div>
                    <div className="flex flex-row sm:flex-col sm:items-end items-center gap-2 sm:gap-1">
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
                </div>

                {/* Invoices */}
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
                    <>
                      {/* Mobile: cards */}
                      <div className="sm:hidden space-y-2">
                        {data.invoices.map(inv => {
                          const s = statusLabel(inv.status)
                          return (
                            <div key={inv.id} className="border border-gray-100 rounded-xl p-4">
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                  <p className="text-xs text-gray-400 mb-0.5">Período</p>
                                  <p className="text-sm text-gray-700">
                                    {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                                  </p>
                                </div>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${s.color}`}>
                                  {s.label}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-gray-800">{formatCurrency(inv.amount)}</p>
                                {inv.hosted_invoice_url && (
                                  <a
                                    href={inv.hosted_invoice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                                  >
                                    Ver fatura <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Desktop: table */}
                      <div className="hidden sm:block border border-gray-100 rounded-xl overflow-hidden">
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
                    </>
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
                            className="flex-1 bg-gray-100 text-gray-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-200 transition"
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
    </div>
  )
}
