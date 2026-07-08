'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, CreditCard as CreditCardIcon, ArrowRightLeft } from 'lucide-react'
import { useToast, Toasts } from './toast'
import BillingBanner from './BillingBanner'
import DashboardHeader from './dashboard/DashboardHeader'
import Button from './ui/Button'
import Modal from './ui/Modal'
import { formatBRL } from '@/lib/utils'
import { MONTHS_PT } from './dashboard/helpers'
import type { User } from '@supabase/supabase-js'
import type {
  Profile,
  Account,
  CreditCard,
  CreditCardInvoice,
  InvoiceExpense,
  BankAccountOption,
} from './cards/types'

type Category = { id: string; name: string; color: string }

const STATUS_LABEL: Record<string, string> = { open: 'Aberta', closed: 'Fechada', paid: 'Paga' }
const STATUS_CLASS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  closed: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
}

function referenceLabel(reference_month: string): string {
  const [y, m] = reference_month.split('-').map(Number)
  return `${MONTHS_PT[m - 1]} de ${y}`
}

function shortReferenceLabel(reference_month: string): string {
  const [y, m] = reference_month.split('-').map(Number)
  return `${MONTHS_PT[m - 1].slice(0, 3)}/${String(y).slice(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso.slice(0, 10) + 'T12:00:00.000Z').toLocaleDateString('pt-BR')
}

export default function CardDetailPage({
  user,
  profile,
  account,
  card,
  initialInvoices,
  initialExpenses,
  bankAccounts,
  categories,
}: {
  user: User
  profile: Profile
  account: Account
  card: CreditCard
  initialInvoices: CreditCardInvoice[]
  initialExpenses: InvoiceExpense[]
  bankAccounts: BankAccountOption[]
  categories: Category[]
}) {
  const supabase = createClient()
  const { toasts, toast, dismiss } = useToast()

  const [invoices, setInvoices] = useState<CreditCardInvoice[]>(initialInvoices)
  const [expenses, setExpenses] = useState<InvoiceExpense[]>(initialExpenses)
  // Default to the current open invoice (the upcoming one), else the most recent.
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    () => initialInvoices.find(i => i.status === 'open')?.id
      ?? initialInvoices[initialInvoices.length - 1]?.id
      ?? null
  )

  const [moveExpense, setMoveExpense] = useState<InvoiceExpense | null>(null)
  const [moveTargetId, setMoveTargetId] = useState('')
  const [payInvoice, setPayInvoice] = useState<CreditCardInvoice | null>(null)
  const [payAccountId, setPayAccountId] = useState<string>(() => bankAccounts.find(a => a.is_default)?.id ?? '')
  const [busy, setBusy] = useState(false)

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  const bankMap = useMemo(() => new Map(bankAccounts.map(a => [a.id, a])), [bankAccounts])

  const expensesByInvoice = useMemo(() => {
    const map = new Map<string, InvoiceExpense[]>()
    for (const e of expenses) {
      if (!e.credit_card_invoice_id) continue
      const list = map.get(e.credit_card_invoice_id) ?? []
      list.push(e)
      map.set(e.credit_card_invoice_id, list)
    }
    return map
  }, [expenses])

  const used = useMemo(
    () => invoices.filter(i => !i.paid_at).reduce((sum, i) => sum + i.total, 0),
    [invoices],
  )
  const available = Math.max(0, card.credit_limit - used)

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId) ?? null

  // Center the carousel on the selected (current) invoice on mount.
  const carouselRef = useRef<HTMLDivElement>(null)
  const selectedColRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const col = selectedColRef.current
    const container = carouselRef.current
    if (col && container) {
      container.scrollLeft = col.offsetLeft - container.clientWidth / 2 + col.clientWidth / 2
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirmMove = async () => {
    if (!moveExpense || !moveTargetId) { toast.error('Selecione a fatura de destino.'); return }
    const fromId = moveExpense.credit_card_invoice_id
    setBusy(true)
    const { error } = await supabase
      .from('expenses')
      .update({ credit_card_invoice_id: moveTargetId })
      .eq('id', moveExpense.id)
    setBusy(false)
    if (error) { toast.error('Erro ao mover lançamento.'); return }

    setExpenses(prev => prev.map(e => e.id === moveExpense.id ? { ...e, credit_card_invoice_id: moveTargetId } : e))
    setInvoices(prev => prev.map(inv => {
      if (inv.id === fromId) return { ...inv, total: inv.total - moveExpense.amount }
      if (inv.id === moveTargetId) return { ...inv, total: inv.total + moveExpense.amount }
      return inv
    }))
    toast.success('Lançamento movido.')
    setMoveExpense(null)
    setMoveTargetId('')
  }

  const confirmPay = async () => {
    if (!payInvoice) return
    if (bankAccounts.length > 0 && !payAccountId) { toast.error('Selecione uma conta para o pagamento.'); return }
    const now = new Date().toISOString()
    setBusy(true)
    const { error } = await supabase
      .from('credit_card_invoices')
      .update({ status: 'paid', paid_at: now, paid_from_account_id: payAccountId || null })
      .eq('id', payInvoice.id)
    setBusy(false)
    if (error) { toast.error('Erro ao pagar fatura.'); return }

    setInvoices(prev => prev.map(inv =>
      inv.id === payInvoice.id ? { ...inv, status: 'paid', paid_at: now, paid_from_account_id: payAccountId || null } : inv
    ))
    toast.success('Fatura paga.')
    setPayInvoice(null)
  }

  const moveTargets = moveExpense
    ? invoices.filter(i => i.id !== moveExpense.credit_card_invoice_id && i.status !== 'paid')
    : []

  return (
    <div className="min-h-screen bg-white dark:bg-dm-surface p-4">
      <div className="max-w-4xl mx-auto">
        <DashboardHeader profile={profile} />
        {account && (
          <BillingBanner
            subscriptionStatus={account.subscription_status}
            trialEndsAt={account.trial_ends_at}
            isOwner={profile.role === 'owner'}
          />
        )}

        <Link href="/cards" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-dm-muted hover:text-gray-700 dark:hover:text-dm-text transition mb-4">
          <ArrowLeft size={16} />
          Voltar aos cartões
        </Link>

        {/* Card summary */}
        <div className="bg-white dark:bg-dm-card rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 dark:bg-dm-field">
              <CreditCardIcon size={18} className="text-gray-500 dark:text-dm-muted" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-dm-text">{card.description}</h2>
              <p className="text-xs text-gray-500 dark:text-dm-muted">Fecha dia {card.closing_day} • Vence dia {card.due_day}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dm-muted mb-1">
            <span>Usado: {formatBRL(used)}</span>
            <span>Disponível: {formatBRL(available)}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-dm-field overflow-hidden">
            <div
              className={`h-full rounded-full ${card.credit_limit > 0 && used >= card.credit_limit ? 'bg-red-500' : 'bg-brand-500'}`}
              style={{ width: `${card.credit_limit > 0 ? Math.min(100, Math.round((used / card.credit_limit) * 100)) : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-dm-muted mt-1">Limite: {formatBRL(card.credit_limit)}</p>
        </div>

        {/* Invoices carousel */}
        <div className="bg-white dark:bg-dm-card rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-dm-text mb-4">Faturas</h3>

          {invoices.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-dm-muted py-8">Nenhuma fatura ainda. Lance uma compra neste cartão para gerar a fatura.</p>
          ) : (
            <>
              {/* One column per invoice; the bar shows how much of the limit it uses. */}
              <div ref={carouselRef} className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {invoices.map(inv => {
                  const selected = selectedInvoiceId === inv.id
                  const pct = card.credit_limit > 0
                    ? Math.min(100, Math.round((inv.total / card.credit_limit) * 100))
                    : (inv.total > 0 ? 100 : 0)
                  return (
                    <button
                      key={inv.id}
                      ref={selected ? selectedColRef : undefined}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className={`shrink-0 w-28 rounded-xl border p-3 flex flex-col items-center text-center transition ${
                        selected
                          ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/10'
                          : 'border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-dm-surface hover:bg-gray-100 dark:hover:bg-dm-field'
                      }`}
                    >
                      <span className="text-xs font-semibold text-gray-700 dark:text-dm-text">{shortReferenceLabel(inv.reference_month)}</span>
                      <span className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_CLASS[inv.status]}`}>
                        {STATUS_LABEL[inv.status]}
                      </span>

                      <div className="my-2 h-24 w-6 rounded-full bg-gray-200 dark:bg-dm-field overflow-hidden flex flex-col justify-end">
                        <div
                          className={`w-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-brand-500'}`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>

                      <span className="text-xs font-bold text-gray-800 dark:text-dm-text">{formatBRL(inv.total)}</span>
                      <span className="text-[10px] text-gray-400 dark:text-dm-muted mt-0.5">{pct}% do limite</span>
                    </button>
                  )
                })}
              </div>

              {/* Selected invoice details + its lançamentos */}
              {selectedInvoice && (() => {
                const items = expensesByInvoice.get(selectedInvoice.id) ?? []
                const payFrom = selectedInvoice.paid_from_account_id ? bankMap.get(selectedInvoice.paid_from_account_id) : undefined
                return (
                  <div className="mt-5 pt-5 border-t border-gray-100 dark:border-white/[0.08]">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 dark:text-dm-text">{referenceLabel(selectedInvoice.reference_month)}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[selectedInvoice.status]}`}>
                            {STATUS_LABEL[selectedInvoice.status]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-dm-muted mt-0.5">
                          Fecha {formatDate(selectedInvoice.closing_date)} • Vence {formatDate(selectedInvoice.due_date)}
                          {payFrom && <> • Paga via {payFrom.name}</>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-800 dark:text-dm-text">{formatBRL(selectedInvoice.total)}</p>
                        {selectedInvoice.status === 'closed' && (
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={() => { setPayInvoice(selectedInvoice); setPayAccountId(bankAccounts.find(a => a.is_default)?.id ?? '') }}
                          >
                            Pagar fatura
                          </Button>
                        )}
                      </div>
                    </div>

                    {items.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-dm-muted py-3">Nenhum lançamento nesta fatura.</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map(item => {
                          const cat = item.category_id ? categoryMap.get(item.category_id) : undefined
                          const isOwn = item.user_id === user.id
                          return (
                            <div key={item.id} className="flex items-center justify-between gap-3 py-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${cat?.color ?? 'bg-gray-400'}`} />
                                <span className="text-sm text-gray-700 dark:text-dm-text truncate">
                                  {item.description} • {formatDate(item.date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm font-semibold text-gray-800 dark:text-dm-text">{formatBRL(item.amount)}</span>
                                {isOwn && selectedInvoice.status !== 'paid' && (
                                  <button
                                    onClick={() => { setMoveExpense(item); setMoveTargetId('') }}
                                    title="Mover para outra fatura"
                                    className="text-gray-400 hover:text-brand-600 transition"
                                  >
                                    <ArrowRightLeft size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </div>

      {/* Move lançamento modal */}
      <Modal open={!!moveExpense} onClose={() => (busy ? undefined : setMoveExpense(null))} size="sm" title="Mover lançamento" showClose>
        {moveExpense && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-dm-muted truncate">{moveExpense.description} • {formatBRL(moveExpense.amount)}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Fatura de destino</label>
              {moveTargets.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-dm-muted">Não há outra fatura disponível para mover.</p>
              ) : (
                <select
                  value={moveTargetId}
                  onChange={e => setMoveTargetId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-white/[0.14] rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm text-gray-700 dark:bg-dm-field dark:text-dm-text"
                >
                  <option value="">Selecione a fatura</option>
                  {moveTargets.map(inv => (
                    <option key={inv.id} value={inv.id}>{referenceLabel(inv.reference_month)} ({STATUS_LABEL[inv.status]})</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={confirmMove} isLoading={busy} disabled={moveTargets.length === 0} className="flex-1">Mover</Button>
              <Button variant="secondary" onClick={() => setMoveExpense(null)} className="flex-1">Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Pay invoice modal */}
      <Modal open={!!payInvoice} onClose={() => (busy ? undefined : setPayInvoice(null))} size="sm" title="Pagar fatura" showClose>
        {payInvoice && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-dm-muted">
              {referenceLabel(payInvoice.reference_month)} • <span className="font-semibold text-gray-700 dark:text-dm-text">{formatBRL(payInvoice.total)}</span>
            </p>
            {bankAccounts.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Debitar da conta</label>
                <select
                  value={payAccountId}
                  onChange={e => setPayAccountId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-white/[0.14] rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm text-gray-700 dark:bg-dm-field dark:text-dm-text"
                >
                  <option value="">Selecione uma conta</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}{acc.is_default ? ' (padrão)' : ''}</option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-dm-muted">Cadastre uma conta bancária para registrar o pagamento.</p>
            )}
            <div className="flex gap-3">
              <Button onClick={confirmPay} isLoading={busy} className="flex-1">Confirmar pagamento</Button>
              <Button variant="secondary" onClick={() => setPayInvoice(null)} className="flex-1">Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
