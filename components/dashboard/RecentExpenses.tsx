'use client'

import { useMemo, useState } from 'react'
import { Trash2, ChevronDown, Circle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 10
import type { User } from '@supabase/supabase-js'
import type { Category, Expense, FinancialAccount, PendingCategoryChange } from './types'

type Props = {
  expenses: Expense[]
  categories: Category[]
  financialAccounts: FinancialAccount[]
  user: User
  onTogglePaid: (exp: Expense) => void
  onDelete: (id: string) => void
  onEdit: (exp: Expense) => void
  onCategoryChange: (change: PendingCategoryChange) => void
}

export default function RecentExpenses({
  expenses,
  categories,
  financialAccounts,
  user,
  onTogglePaid,
  onDelete,
  onEdit,
  onCategoryChange,
}: Props) {
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterAccountId, setFilterAccountId] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const categoryMap = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories],
  )
  const accountMap = useMemo(
    () => new Map(financialAccounts.map(a => [a.id, a])),
    [financialAccounts],
  )

  const filtered = useMemo(
    () => expenses.filter(e =>
      (
        !filterCategoryId ||
        (filterCategoryId === '__no_category__' ? !e.category_id : e.category_id === filterCategoryId)
      ) &&
      (
        !filterAccountId ||
        (filterAccountId === '__no_account__' ? !e.financial_account_id : e.financial_account_id === filterAccountId)
      ),
    ),
    [expenses, filterCategoryId, filterAccountId],
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const hasActiveFilter = !!(filterCategoryId || filterAccountId)

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value)
    setPage(0)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-800">Últimos lançamentos</h2>
        <div className="flex flex-wrap gap-2">
          {financialAccounts.length > 0 && (
            <select
              value={filterAccountId}
              onChange={e => changeFilter(setFilterAccountId, e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 sm:w-44"
            >
              <option value="">Todas as contas</option>
              <option value="__no_account__">Sem conta</option>
              {financialAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          )}
          <select
            value={filterCategoryId}
            onChange={e => changeFilter(setFilterCategoryId, e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 sm:w-48"
          >
            <option value="">Todas as categorias</option>
            <option value="__no_category__">Sem categoria</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overlay to close inline category dropdown */}
      {editingCategoryId && (
        <div className="fixed inset-0 z-10" onClick={() => setEditingCategoryId(null)} />
      )}

      {/* List */}
      <div className="space-y-2">
        {paginated.map(exp => {
          const category = exp.category_id ? categoryMap.get(exp.category_id) : undefined
          const financialAccount = exp.financial_account_id ? accountMap.get(exp.financial_account_id) : undefined
          const date = new Date(exp.date)
          const createdAt = new Date(exp.created_at)
          const isOwn = exp.user_id === user.id

          const categoryPill = (
            <div className="relative">
              {isOwn ? (
                <button
                  onClick={() => setEditingCategoryId(editingCategoryId === exp.id ? null : exp.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${category?.color ?? 'bg-gray-400'} text-white flex items-center gap-1 hover:opacity-80 transition`}
                >
                  {category?.name ?? 'Sem categoria'}
                  <ChevronDown size={10} className="opacity-70" />
                </button>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${category?.color ?? 'bg-gray-400'} text-white`}>
                  {category?.name ?? 'Sem categoria'}
                </span>
              )}

              {editingCategoryId === exp.id && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px]">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setEditingCategoryId(null)
                        onCategoryChange({ expenseId: exp.id, newCategoryId: cat.id })
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left transition ${
                        cat.id === exp.category_id ? 'font-semibold text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cat.color} shrink-0`} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )

          const actions = isOwn && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onTogglePaid(exp)}
                title={exp.paid_at ? 'Desmarcar pagamento' : 'Marcar como pago'}
                className={`transition ${exp.paid_at ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'}`}
              >
                {exp.paid_at ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </button>
              <button
                onClick={() => onDelete(exp.id)}
                title="Excluir lançamento"
                className="text-red-500 hover:text-red-700 transition"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )

          const amountButton = isOwn ? (
            <button
              onClick={() => onEdit(exp)}
              title="Editar lançamento"
              className="font-bold text-gray-800 hover:text-red-600 transition underline underline-offset-2 decoration-dashed decoration-gray-400"
            >
              R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </button>
          ) : (
            <span className="font-bold text-gray-800">
              R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )

          return (
            <div key={exp.id}>
              {/* Mobile card */}
              <div className="sm:hidden p-4 bg-gray-50 rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${category?.color ?? 'bg-gray-400'}`} />
                    <p className="font-medium text-gray-800 leading-snug">
                      {exp.description} • {date.toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="shrink-0 ml-2">{amountButton}</div>
                </div>
                <p className="text-xxs text-gray-500 mt-1 ml-4">
                  {exp.profiles?.name} • {createdAt.toLocaleDateString('pt-BR')} às{' '}
                  {createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="flex items-center justify-between mt-2.5 ml-4">
                  {/* Category pill with left-aligned dropdown for mobile */}
                  <div className="relative">
                    {isOwn ? (
                      <button
                        onClick={() => setEditingCategoryId(editingCategoryId === exp.id ? null : exp.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${category?.color ?? 'bg-gray-400'} text-white flex items-center gap-1 hover:opacity-80 transition`}
                      >
                        {category?.name ?? 'Sem categoria'}
                        <ChevronDown size={10} className="opacity-70" />
                      </button>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${category?.color ?? 'bg-gray-400'} text-white`}>
                        {category?.name ?? 'Sem categoria'}
                      </span>
                    )}
                    {editingCategoryId === exp.id && (
                      <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px]">
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setEditingCategoryId(null)
                              onCategoryChange({ expenseId: exp.id, newCategoryId: cat.id })
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left transition ${
                              cat.id === exp.category_id ? 'font-semibold text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${cat.color} shrink-0`} />
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {actions}
                </div>
              </div>

              {/* Desktop row */}
              <div className="hidden sm:flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-2 h-2 rounded-full ${category?.color ?? 'bg-gray-400'}`} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {exp.description} • {date.toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {exp.profiles?.name} • {createdAt.toLocaleDateString('pt-BR')} às{' '}
                      {createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {financialAccount && <> • <span className="font-medium">{financialAccount.name}</span></>}
                    </p>
                  </div>
                  {categoryPill}
                  <div className="min-w-[100px] text-right">{amountButton}</div>
                </div>
                {isOwn && <div className="ml-4">{actions}</div>}
              </div>
            </div>
          )
        })}

        {expenses.length === 0 && (
          <p className="text-center text-gray-500 py-8">Nenhuma despesa cadastrada ainda.</p>
        )}

        {expenses.length > 0 && hasActiveFilter && filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8">Nenhum lançamento com este filtro.</p>
        )}
      </div>

      {/* Pagination footer */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600 px-2">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}