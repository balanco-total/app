'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Circle, CheckCircle2, Repeat, CreditCard, ChevronLeft } from 'lucide-react'
import { applyMask, parseMasked } from '@/lib/utils'
import { MONTHS_PT } from './helpers'
import type { VirtualExpense } from '@/lib/recurring'

export type AsideInvoice = {
  id: string
  credit_card_id: string
  cardName: string
  reference_month: string
  closing_date: string
  due_date: string
  status: 'open' | 'closed' | 'paid'
  total: number
}

const INVOICE_STATUS_LABEL: Record<string, string> = { open: 'Aberta', closed: 'Fechada', paid: 'Paga' }
const INVOICE_STATUS_CLASS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  closed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

function referenceLabel(reference_month: string) {
  const [y, m] = reference_month.split('-').map(Number)
  return `${MONTHS_PT[m - 1]} de ${y}`
}

export type AsideExpense = {
  id: string
  amount: number
  date: string
  description?: string | null
  paid_at?: string | null
  financial_account_id?: string | null
  profiles?: { name: string } | null
  // optional per-expense category (used when the aside aggregates multiple categories)
  categoryName?: string | null
  categoryColor?: string | null
  // virtual-only extras
  _virtual?: true
  recurring_expense_id?: string
  occurrence_year_month?: string
}

type AsideCategory = {
  id: string
  name: string
}

function fmtAmount(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${MONTHS_PT[m - 1].slice(0, 3)} ${y}`
}

export default function CategoryExpensesAside({
  category,
  expenses,
  invoices = [],
  onClose,
  selectedMonth,
  loading = false,
  onTogglePaid,
  onEdit,
  onEndRecurrence,
  onMaterializeEdit,
  onFetchInvoiceExpenses,
  onPayInvoice,
}: {
  category: AsideCategory | null
  expenses: AsideExpense[]
  invoices?: AsideInvoice[]
  onClose: () => void
  selectedMonth: string
  loading?: boolean
  onTogglePaid?: (exp: AsideExpense) => void
  onEdit?: (exp: AsideExpense) => void
  // virtual-specific handlers
  onEndRecurrence?: (recurringExpenseId: string, yearMonth: string) => void
  onMaterializeEdit?: (
    recurringExpenseId: string,
    yearMonth: string,
    amount: number,
    scope: 'month' | 'future'
  ) => void
  // credit-card invoice handlers (only used by the "Não pagos" aside)
  onFetchInvoiceExpenses?: (invoiceId: string) => Promise<AsideExpense[]>
  onPayInvoice?: (invoice: AsideInvoice) => void
}) {
  const isOpen = !!category

  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)
  const monthLabel = `${MONTHS_PT[selMonthNum - 1]} ${selYear}`

  // Drill-in view: clicking an invoice's value replaces the panel body with its lançamentos.
  const [detail, setDetail] = useState<{ invoice: AsideInvoice; loading: boolean; expenses: AsideExpense[] } | null>(null)

  // Reset the drill-in whenever the aside switches to a different category/context or closes.
  useEffect(() => { setDetail(null) }, [category?.id])

  // If the open invoice is paid/removed elsewhere, fall back to the list view.
  useEffect(() => {
    if (detail && !invoices.some(i => i.id === detail.invoice.id)) setDetail(null)
  }, [invoices, detail])

  const openInvoiceDetail = async (invoice: AsideInvoice) => {
    setDetail({ invoice, loading: true, expenses: [] })
    const exps = (await onFetchInvoiceExpenses?.(invoice.id)) ?? []
    setDetail(prev => (prev && prev.invoice.id === invoice.id ? { ...prev, loading: false, expenses: exps } : prev))
  }

  // Edit state for virtual occurrence
  const [editingVirtual, setEditingVirtual] = useState<{
    recurringExpenseId: string
    yearMonth: string
    amountDisplay: string
  } | null>(null)

  // Confirm end-recurrence state
  const [confirmEnd, setConfirmEnd] = useState<{
    recurringExpenseId: string
    yearMonth: string
  } | null>(null)

  const invoicesTotal = invoices.reduce((s, i) => s + i.total, 0)
  const total = expenses.reduce((s, e) => s + e.amount, 0) + invoicesTotal
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date))
  const sortedInvoices = [...invoices].sort((a, b) => a.due_date.localeCompare(b.due_date))
  const itemCount = sorted.length + invoices.length
  const itemNoun = invoices.length > 0
    ? (itemCount === 1 ? 'item' : 'itens')
    : (itemCount === 1 ? 'despesa' : 'despesas')

  const handleEditVirtualConfirm = (scope: 'month' | 'future') => {
    if (!editingVirtual) return
    const amount = parseMasked(editingVirtual.amountDisplay)
    if (amount <= 0) return
    onMaterializeEdit?.(editingVirtual.recurringExpenseId, editingVirtual.yearMonth, amount, scope)
    setEditingVirtual(null)
  }

  return (
    <>
      {/* backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-dm-card shadow-2xl z-[45] flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.08]">
          {detail ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setDetail(null)}
                  className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dm-field transition-colors shrink-0"
                  aria-label="Voltar"
                >
                  <ChevronLeft size={20} className="text-gray-500 dark:text-dm-muted" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-dm-text truncate">{detail.invoice.cardName}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{referenceLabel(detail.invoice.reference_month)}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dm-field transition-colors shrink-0"
                aria-label="Fechar"
              >
                <X size={20} className="text-gray-500 dark:text-dm-muted" />
              </button>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-dm-text">{category?.name ?? ''}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{monthLabel}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dm-field transition-colors"
                aria-label="Fechar"
              >
                <X size={20} className="text-gray-500 dark:text-dm-muted" />
              </button>
            </>
          )}
        </div>

        {detail ? (
          <InvoiceDetail detail={detail} onPay={onPayInvoice} />
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* total */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-dm-surface border-b border-gray-100 dark:border-white/[0.08]">
              <span className="text-sm text-gray-500 dark:text-dm-muted">Total: </span>
              <span className="text-sm font-semibold text-gray-800 dark:text-dm-text">{fmtAmount(total)}</span>
              <span className="text-xs text-gray-400 ml-2">({itemCount} {itemNoun})</span>
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto">
              {itemCount === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-400 dark:text-dm-muted text-sm">
                  Nenhuma despesa neste mês.
                </div>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-white/[0.08]">
                  {sortedInvoices.map(inv => (
                    <li key={inv.id} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-dm-field transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <CreditCard size={14} className="text-gray-400 shrink-0" />
                            <p className="text-sm font-medium text-gray-800 dark:text-dm-text truncate">
                              Fatura {inv.cardName}
                            </p>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${INVOICE_STATUS_CLASS[inv.status]}`}>
                              {INVOICE_STATUS_LABEL[inv.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-400">Vence {fmtDate(inv.due_date)}</span>
                            <span className="text-xs text-gray-400">· {referenceLabel(inv.reference_month)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => openInvoiceDetail(inv)}
                            title="Ver lançamentos da fatura"
                            className="text-sm font-semibold text-red-500 whitespace-nowrap underline underline-offset-2 decoration-dashed decoration-red-300 hover:text-red-700 transition"
                          >
                            {fmtAmount(inv.total)}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {sorted.map(exp => {
                    const isVirtual = exp._virtual === true
                    return (
                      <li key={exp.id} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-dm-field transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium text-gray-800 dark:text-dm-text truncate">
                                {exp.description ?? '—'}
                              </p>
                              {isVirtual && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 shrink-0">
                                  <Repeat size={10} />
                                  Recorrente
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-400">{fmtDate(exp.date)}</span>
                              {exp.profiles?.name && (
                                <span className="text-xs text-gray-400">· {exp.profiles.name}</span>
                              )}
                              {exp.categoryName && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-dm-field text-gray-600 dark:text-dm-muted">
                                  <span className={`w-2 h-2 rounded-full ${exp.categoryColor ?? 'bg-gray-400'}`} />
                                  {exp.categoryName}
                                </span>
                              )}
                            </div>
                            {isVirtual && exp.recurring_expense_id && exp.occurrence_year_month && (
                              <button
                                onClick={() => setConfirmEnd({ recurringExpenseId: exp.recurring_expense_id!, yearMonth: exp.occurrence_year_month! })}
                                className="text-xs text-gray-400 hover:text-red-500 transition mt-0.5 underline underline-offset-2 decoration-dashed"
                              >
                                Encerrar recorrência
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isVirtual ? (
                              <>
                                {onTogglePaid && (
                                  <button
                                    onClick={() => onTogglePaid(exp)}
                                    title="Marcar como pago"
                                    className="text-gray-300 dark:text-dm-faint hover:text-gray-500 dark:hover:text-dm-muted transition"
                                  >
                                    <Circle size={18} />
                                  </button>
                                )}
                                {onMaterializeEdit && exp.recurring_expense_id && exp.occurrence_year_month && (
                                  <button
                                    onClick={() => setEditingVirtual({
                                      recurringExpenseId: exp.recurring_expense_id!,
                                      yearMonth: exp.occurrence_year_month!,
                                      amountDisplay: exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                    })}
                                    title="Editar valor"
                                    className="text-sm font-semibold text-red-500 whitespace-nowrap underline underline-offset-2 decoration-dashed decoration-red-300 hover:text-red-700 transition"
                                  >
                                    {fmtAmount(exp.amount)}
                                  </button>
                                )}
                                {!onMaterializeEdit && (
                                  <span className="text-sm font-semibold text-red-500 whitespace-nowrap">
                                    {fmtAmount(exp.amount)}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                {onTogglePaid && (
                                  <button
                                    onClick={() => onTogglePaid(exp)}
                                    title={exp.paid_at ? 'Desmarcar pagamento' : 'Marcar como pago'}
                                    className={`transition ${exp.paid_at ? 'text-green-500 hover:text-green-700' : 'text-gray-300 dark:text-dm-faint hover:text-gray-500 dark:hover:text-dm-muted'}`}
                                  >
                                    {exp.paid_at ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                  </button>
                                )}
                                {onEdit ? (
                                  <button
                                    onClick={() => onEdit(exp)}
                                    title="Editar"
                                    className="text-sm font-semibold text-red-500 whitespace-nowrap underline underline-offset-2 decoration-dashed decoration-red-300 hover:text-red-700 transition"
                                  >
                                    {fmtAmount(exp.amount)}
                                  </button>
                                ) : (
                                  <span className="text-sm font-semibold text-red-500 whitespace-nowrap">
                                    {fmtAmount(exp.amount)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal: edit virtual occurrence value */}
      {editingVirtual && (() => {
        const amount = parseMasked(editingVirtual.amountDisplay)
        const amountValid = amount > 0 && amount <= 1_000_000
        return (
          <div className="fixed inset-0 z-[50] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setEditingVirtual(null)} />
            <div className="relative bg-white dark:bg-dm-card rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-800 dark:text-dm-text mb-1">Editar valor</h3>
              <p className="text-sm text-gray-500 dark:text-dm-muted mb-4">Despesa recorrente</p>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={editingVirtual.amountDisplay}
                  onChange={e => setEditingVirtual(prev => prev ? { ...prev, amountDisplay: applyMask(e.target.value) } : null)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white dark:bg-dm-field dark:text-dm-text dark:border-white/[0.14] ${!amountValid && editingVirtual.amountDisplay ? 'border-red-400' : 'border-gray-300 dark:border-white/[0.14]'}`}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  disabled={!amountValid}
                  onClick={() => handleEditVirtualConfirm('month')}
                  className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Só neste mês
                </button>
                <button
                  disabled={!amountValid}
                  onClick={() => handleEditVirtualConfirm('future')}
                  className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm bg-gray-100 dark:bg-dm-surface text-gray-700 dark:text-dm-muted hover:bg-gray-200 dark:hover:bg-dm-field disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Neste mês e em todos os futuros
                </button>
                <button
                  onClick={() => setEditingVirtual(null)}
                  className="w-full px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal: confirm end recurrence */}
      {confirmEnd && (() => {
        const [y, m] = confirmEnd.yearMonth.split('-').map(Number)
        const label = `${MONTHS_PT[m - 1]} ${y}`
        return (
          <div className="fixed inset-0 z-[50] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmEnd(null)} />
            <div className="relative bg-white dark:bg-dm-card rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-800 dark:text-dm-text mb-2">Encerrar recorrência?</h3>
              <p className="text-sm text-gray-500 dark:text-dm-muted mb-5">
                A despesa deixará de aparecer a partir de <strong>{label}</strong>. O histórico anterior é preservado.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onEndRecurrence?.(confirmEnd.recurringExpenseId, confirmEnd.yearMonth)
                    setConfirmEnd(null)
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm bg-red-600 text-white hover:bg-red-700 transition"
                >
                  Encerrar
                </button>
                <button
                  onClick={() => setConfirmEnd(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm bg-gray-100 dark:bg-dm-surface text-gray-700 dark:text-dm-muted hover:bg-gray-200 dark:hover:bg-dm-field transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}

/** Drill-in view: a single invoice's lançamentos (read-only) with a pay action when closed. */
function InvoiceDetail({
  detail,
  onPay,
}: {
  detail: { invoice: AsideInvoice; loading: boolean; expenses: AsideExpense[] }
  onPay?: (invoice: AsideInvoice) => void
}) {
  const { invoice, loading, expenses } = detail
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date))
  return (
    <>
      {/* invoice summary */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-dm-surface border-b border-gray-100 dark:border-white/[0.08] flex items-center justify-between gap-3">
        <div>
          <span className="text-sm text-gray-500 dark:text-dm-muted">Total: </span>
          <span className="text-sm font-semibold text-gray-800 dark:text-dm-text">{fmtAmount(invoice.total)}</span>
          <p className="text-xs text-gray-400 mt-0.5">Vence {fmtDate(invoice.due_date)}</p>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_CLASS[invoice.status]}`}>
          {INVOICE_STATUS_LABEL[invoice.status]}
        </span>
      </div>

      {/* lançamentos */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="text-gray-400 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 dark:text-dm-muted text-sm">
            Nenhum lançamento nesta fatura.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-white/[0.08]">
            {sorted.map(exp => (
              <li key={exp.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-dm-text truncate">{exp.description ?? '—'}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400">{fmtDate(exp.date)}</span>
                      {exp.profiles?.name && <span className="text-xs text-gray-400">· {exp.profiles.name}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-red-500 whitespace-nowrap shrink-0">{fmtAmount(exp.amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* pay action — only when the invoice is closed */}
      {!loading && invoice.status === 'closed' && onPay && (
        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/[0.08]">
          <button
            onClick={() => onPay(invoice)}
            className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm bg-brand-500 hover:bg-brand-600 text-white transition"
          >
            Pagar fatura
          </button>
        </div>
      )}
      {!loading && invoice.status === 'open' && (
        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/[0.08]">
          <p className="text-xs text-gray-400 dark:text-dm-muted text-center">
            A fatura ainda está aberta. Você poderá pagá-la quando ela fechar.
          </p>
        </div>
      )}
    </>
  )
}

export type { VirtualExpense }
