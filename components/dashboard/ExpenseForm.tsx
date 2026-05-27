'use client'

import { useState } from 'react'
import { PlusCircle, ChevronDown, Repeat, Circle, CheckCircle2, X } from 'lucide-react'
import {
  applyMask,
  parseDateDisplay,
  toLocalDateStr,
  FIELD_PATTERN,
  MONTHS_PT_LOWER,
} from './helpers'
import type { Category, FinancialAccount } from './types'

type Props = {
  categories: Category[]
  financialAccounts: FinancialAccount[]
  description: string
  setDescription: (v: string) => void
  amount: string
  setAmount: (v: string) => void
  selectedCategory: string
  setSelectedCategory: (v: string) => void
  expenseDate: string
  setExpenseDate: (v: string) => void
  quantity: string
  setQuantity: (v: string) => void
  paid: boolean
  setPaid: (v: boolean | ((prev: boolean) => boolean)) => void
  selectedFinancialAccount: string
  setSelectedFinancialAccount: (v: string) => void
  isRecurring: boolean
  setIsRecurring: (v: boolean) => void
  onAdd: () => void
  onDeleteCategory: (cat: Category) => void
  onAddCategory: (name: string) => void
}

export default function ExpenseForm({
  categories,
  financialAccounts,
  description,
  setDescription,
  amount,
  setAmount,
  selectedCategory,
  setSelectedCategory,
  expenseDate,
  setExpenseDate,
  quantity,
  setQuantity,
  paid,
  setPaid,
  selectedFinancialAccount,
  setSelectedFinancialAccount,
  isRecurring,
  setIsRecurring,
  onAdd,
  onDeleteCategory,
  onAddCategory,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    onAddCategory(newCategoryName.trim())
    setNewCategoryName('')
  }

  // Compute installment preview/warning for the advanced section
  const today = new Date()
  const todayStr = toLocalDateStr(today)
  const internalDate = parseDateDisplay(expenseDate)
  const dateStr = internalDate || todayStr
  const qty = Math.max(1, Math.min(99, parseInt(quantity, 10) || 1))

  const installmentWarning = (() => {
    if (qty <= 1) return null
    const [y, m, d] = dateStr.split('-').map(Number)
    for (let i = 1; i < qty; i++) {
      const check = new Date(y, m - 1 + i, d)
      if (check.getDate() !== d) {
        const idx = (m - 1 + i) % 12
        const yr = y + Math.floor((m - 1 + i) / 12)
        return `Dia ${d} não existe em ${MONTHS_PT_LOWER[idx]} de ${yr}`
      }
    }
    return null
  })()

  const installmentPreview = (() => {
    if (qty <= 1 || installmentWarning) return null
    const [y, m, d] = dateStr.split('-').map(Number)
    const last = new Date(y, m - 1 + qty - 1, d)
    const fmt = (dd: number, mm: number, yy: number) =>
      `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yy}`
    return `${fmt(d, m, y)} à ${fmt(last.getDate(), last.getMonth() + 1, last.getFullYear())}`
  })()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        <PlusCircle size={24} className="text-red-600" />
        Nova despesa
      </h2>

      <div className="space-y-4">
        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição</label>
          <input
            type="text"
            maxLength={60}
            value={description}
            onChange={e => setDescription(e.target.value.replace(FIELD_PATTERN, ''))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            placeholder="Ex: Supermercado"
          />
        </div>

        {/* Valor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Valor (R$)</label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={e => setAmount(applyMask(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            placeholder="0,00"
          />
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div
                key={cat.id}
                className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedCategory === cat.id
                    ? `${cat.color} text-white`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <button onClick={() => setSelectedCategory(cat.id)}>
                  {cat.name}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteCategory(cat) }}
                  className={`rounded-full p-0.5 hover:bg-black/20 transition ${
                    selectedCategory === cat.id ? 'text-white' : 'text-gray-400'
                  }`}
                  title="Excluir categoria"
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {/* Nova categoria inline */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600">
              <input
                type="text"
                title="Digite e aperte Enter para cadastrar"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value.replace(FIELD_PATTERN, ''))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
                placeholder="Nova categoria"
                maxLength={60}
                className="bg-transparent outline-none w-32 text-gray-500 placeholder-gray-400 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Opções avançadas */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition w-full"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            />
            <span>Opções avançadas</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-3 space-y-3">
              {/* Recorrente */}
              <div className="flex items-center justify-between py-0.5">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recorrente</label>
                  <p className="text-xs text-gray-400 dark:text-gray-400">Aparece todo mês sem limite</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`flex items-center gap-1.5 text-sm font-medium transition ${isRecurring ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  {isRecurring ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  <span>{isRecurring ? 'Sim' : 'Não'}</span>
                </button>
              </div>

              {isRecurring && (
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <Repeat size={13} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-500">
                    A despesa será gerada todo mês no dia informado, a partir deste mês, sem data de encerramento.
                  </p>
                </div>
              )}

              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {isRecurring ? 'Dia de vencimento' : 'Data'}
                </label>
                <input
                  type="date"
                  value={parseDateDisplay(expenseDate) || ''}
                  onChange={e => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split('-')
                      setExpenseDate(`${d}/${m}/${y}`)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-700 dark:bg-gray-700 dark:text-gray-100 text-sm"
                />
              </div>

              {/* Quantidade (hidden when recurring) */}
              {!isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '' || (parseInt(v, 10) >= 1 && parseInt(v, 10) <= 99)) setQuantity(v)
                    }}
                    min="1"
                    max="99"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm dark:bg-gray-700 dark:text-gray-100"
                  />
                  {installmentWarning ? (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <span>⚠</span> {installmentWarning}
                    </p>
                  ) : installmentPreview ? (
                    <div className="mt-2 flex items-center gap-2.5 bg-red-50 dark:bg-red-100 border border-red-100 rounded-lg px-3 py-2">
                      <Repeat size={13} className="text-red-400 shrink-0" />
                      <p className="text-xs text-red-400">{installmentPreview}</p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Pago (hidden when recurring) */}
              {!isRecurring && (
                <div className="flex items-center justify-between py-0.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pago</label>
                  <button
                    type="button"
                    onClick={() => setPaid(v => !v)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition ${paid ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    {paid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    <span>{paid ? 'Sim' : 'Não'}</span>
                  </button>
                </div>
              )}

              {paid && qty > 1 && !isRecurring && (
                <p className="text-xs text-amber-500">Parcelas futuras serão salvas como não pagas.</p>
              )}

              {/* Conta */}
              {financialAccounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Conta</label>
                  <select
                    value={selectedFinancialAccount}
                    onChange={e => setSelectedFinancialAccount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-100"
                  >
                    {financialAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}{acc.is_default ? ' (padrão)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onAdd}
          className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
        >
          {isRecurring ? 'Adicionar despesa recorrente' : parseInt(quantity, 10) > 1 ? `Adicionar ${quantity} despesas` : 'Adicionar despesa'}
        </button>
      </div>
    </div>
  )
}