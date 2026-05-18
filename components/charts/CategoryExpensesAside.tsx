'use client'

import { X, Loader2, Circle, CheckCircle2 } from 'lucide-react'
import { MONTHS_PT } from './helpers'

type AsideExpense = {
  id: string
  amount: number
  date: string
  description?: string | null
  paid_at?: string | null
  financial_account_id?: string | null
  profiles?: { name: string } | null
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
}: {
  category: AsideCategory | null
  expenses: AsideExpense[]
  onClose: () => void
  selectedMonth: string
  loading?: boolean
  onTogglePaid?: (exp: AsideExpense) => void
  onEdit?: (exp: AsideExpense) => void
}) {
  const isOpen = !!category

  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)
  const monthLabel = `${MONTHS_PT[selMonthNum - 1]} ${selYear}`

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date))

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
                  {sorted.map(exp => (
                    <li key={exp.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {exp.description ?? '—'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400">{fmtDate(exp.date)}</span>
                            {exp.profiles?.name && (
                              <span className="text-xs text-gray-400">· {exp.profiles.name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
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
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
