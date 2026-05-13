'use client'

import { useState } from 'react'
import { PlusCircle, Calendar, ChevronDown, Repeat, Circle, CheckCircle2, X } from 'lucide-react'
import {
  applyMask,
  applyDateMask,
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
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <PlusCircle size={24} className="text-red-600" />
        Nova despesa
      </h2>

      <div className="space-y-4">
        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
          <input
            type="text"
            maxLength={60}
            value={description}
            onChange={e => setDescription(e.target.value.replace(FIELD_PATTERN, ''))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Ex: Supermercado"
          />
        </div>

        {/* Valor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={e => setAmount(applyMask(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="0,00"
          />
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div
                key={cat.id}
                className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedCategory === cat.id
                    ? `${cat.color} text-white`
                    : 'bg-gray-100 text-gray-700'
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
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-gray-50 border-2 border-dashed border-gray-300">
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
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition w-full"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            />
            <span>Opções avançadas</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50 rounded-xl px-3 py-3 space-y-3">
              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={expenseDate}
                    onChange={e => setExpenseDate(applyDateMask(e.target.value))}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-700 text-sm"
                  />
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantidade</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => {
                    const v = e.target.value
                    if (v === '' || (parseInt(v, 10) >= 1 && parseInt(v, 10) <= 99)) setQuantity(v)
                  }}
                  min="1"
                  max="99"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
                {installmentWarning ? (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span>⚠</span> {installmentWarning}
                  </p>
                ) : installmentPreview ? (
                  <div className="mt-2 flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <Repeat size={13} className="text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{installmentPreview}</p>
                  </div>
                ) : null}
              </div>

              {/* Pago */}
              <div className="flex items-center justify-between py-0.5">
                <label className="text-sm font-medium text-gray-700">Pago</label>
                <button
                  type="button"
                  onClick={() => setPaid(v => !v)}
                  className={`flex items-center gap-1.5 text-sm font-medium transition ${paid ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {paid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  <span>{paid ? 'Sim' : 'Não'}</span>
                </button>
              </div>

              {paid && qty > 1 && (
                <p className="text-xs text-amber-500">Parcelas futuras serão salvas como não pagas.</p>
              )}

              {/* Conta */}
              {financialAccounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Conta</label>
                  <select
                    value={selectedFinancialAccount}
                    onChange={e => setSelectedFinancialAccount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-700"
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
          {parseInt(quantity, 10) > 1 ? `Adicionar ${quantity} despesas` : 'Adicionar despesa'}
        </button>
      </div>
    </div>
  )
}