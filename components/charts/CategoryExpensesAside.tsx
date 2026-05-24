'use client'

import { useState } from 'react'
import { X, Loader2, Circle, CheckCircle2, Repeat } from 'lucide-react'
import { applyMask, parseMasked } from '@/lib/utils'
import { MONTHS_PT } from './helpers'
import type { VirtualExpense } from '@/lib/recurring'

type AsideExpense = {
  id: string
  amount: number
  date: string
  description?: string | null
  paid_at?: string | null
  financial_account_id?: string | null
  profiles?: { name: string } | null
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
  onClose,
  selectedMonth,
  loading = false,
  onTogglePaid,
  onEdit,
  onMaterializePaid,
  onEndRecurrence,
  onMaterializeEdit,
}: {
  category: AsideCategory | null
  expenses: AsideExpense[]
  onClose: () => void
  selectedMonth: string
  loading?: boolean
  onTogglePaid?: (exp: AsideExpense) => void
  onEdit?: (exp: AsideExpense) => void
  // virtual-specific handlers
  onMaterializePaid?: (recurringExpenseId: string, yearMonth: string) => void
  onEndRecurrence?: (recurringExpenseId: string, yearMonth: string) => void
  onMaterializeEdit?: (
    recurringExpenseId: string,
    yearMonth: string,
    amount: number,
    scope: 'month' | 'future'
  ) => void
}) {
  const isOpen = !!category

  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)
  const monthLabel = `${MONTHS_PT[selMonthNum - 1]} ${selYear}`

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

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date))

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
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[45] flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{category?.name ?? ''}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{monthLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* total */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-sm text-gray-500">Total: </span>
              <span className="text-sm font-semibold text-gray-800">{fmtAmount(total)}</span>
              <span className="text-xs text-gray-400 ml-2">({sorted.length} despesa{sorted.length !== 1 ? 's' : ''})</span>
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto">
              {sorted.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                  Nenhuma despesa neste mês.
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {sorted.map(exp => {
                    const isVirtual = exp._virtual === true
                    return (
                      <li key={exp.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {exp.description ?? '—'}
                              </p>
                              {isVirtual && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 shrink-0">
                                  <Repeat size={10} />
                                  Recorrente
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">{fmtDate(exp.date)}</span>
                              {exp.profiles?.name && (
                                <span className="text-xs text-gray-400">· {exp.profiles.name}</span>
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
                                {onMaterializePaid && exp.recurring_expense_id && exp.occurrence_year_month && (
                                  <button
                                    onClick={() => onMaterializePaid(exp.recurring_expense_id!, exp.occurrence_year_month!)}
                                    title="Marcar como pago"
                                    className="text-gray-300 hover:text-gray-500 transition"
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
                                    className={`transition ${exp.paid_at ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'}`}
                                  >
                                    {exp.paid_at ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                  </button>
                                )}
                                {onEdit ? (
                                  <button
                                    onClick={() => onEdit(exp)}
                                    title="Editar lançamento"
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
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Editar valor</h3>
              <p className="text-sm text-gray-500 mb-4">Despesa recorrente</p>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={editingVirtual.amountDisplay}
                  onChange={e => setEditingVirtual(prev => prev ? { ...prev, amountDisplay: applyMask(e.target.value) } : null)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm ${!amountValid && editingVirtual.amountDisplay ? 'border-red-400' : 'border-gray-300'}`}
                />
              </div>
              <p className="text-xs text-gray-400 mb-4">Aplicar alteração em:</p>
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
                  className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Encerrar recorrência?</h3>
              <p className="text-sm text-gray-500 mb-5">
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
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
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

export type { VirtualExpense }
