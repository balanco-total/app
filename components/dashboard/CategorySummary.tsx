'use client'

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS_PT } from './helpers'
import type { CategoryWithTotal } from './types'

type Props = {
  categorySummary: CategoryWithTotal[]
  totalMonth: number
  totalUnpaid: number
  selectedMonth: string
  onShiftMonth: (delta: number) => void
  onCategoryClick?: (cat: { id: string; name: string }) => void
  onOthersClick?: (categoryIds: string[]) => void
}

export default function CategorySummary({
  categorySummary,
  totalMonth,
  totalUnpaid,
  selectedMonth,
  onShiftMonth,
  onCategoryClick,
  onOthersClick,
}: Props) {
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)
  const categoriesWithExpenses = categorySummary.filter(cat => cat.total > 0)

  const mainCategories = categoriesWithExpenses.filter(cat =>
    totalMonth > 0 ? (cat.total / totalMonth) * 100 >= 5 : true
  )
  const smallCategories = categoriesWithExpenses.filter(cat =>
    totalMonth > 0 ? (cat.total / totalMonth) * 100 < 5 : false
  )
  const othersTotal = smallCategories.reduce((sum, cat) => sum + cat.total, 0)
  const othersDescription = smallCategories
    .map(cat => {
      const pct = totalMonth > 0 ? (cat.total / totalMonth) * 100 : 0
      return `${cat.name} ${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    })
    .join(', ')

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Despesa por categoria</h2>
          {onCategoryClick && categoriesWithExpenses.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">Clique em uma categoria para ver as despesas</p>
          )}
        </div>
        <div className="flex items-center gap-1 sm:self-auto mt-2 sm:mt-0">
          <button
            onClick={() => onShiftMonth(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
            title="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-1 sm:flex-none items-center gap-2 px-4 py-1.5 bg-red-50 border border-red-200 rounded-lg sm:min-w-[160px] justify-center">
            <Calendar size={15} className="text-red-500 shrink-0" />
            <span className="text-sm font-semibold text-red-700">
              {MONTHS_PT[selMonthNum - 1]} {selYear}
            </span>
          </div>
          <button
            onClick={() => onShiftMonth(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
            title="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-red-50 rounded-lg p-4 mb-4 flex justify-between items-start gap-4">
        <div>
          <p className="text-sm text-gray-600">Total do mês</p>
          <p className="sm:text-3xl text-xl font-bold text-red-600">
            R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        {totalUnpaid > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Não pagos</p>
            <p className="sm:text-xl text-sm font-bold text-orange-500">
              R$ {totalUnpaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>

      {/* Category list */}
      <div className="space-y-3">
        {categoriesWithExpenses.length === 0 && (
          <p className="text-center text-gray-500 py-4">Nenhuma despesa neste mês.</p>
        )}
        {mainCategories.map(cat => {
          const pct = totalMonth > 0 ? (cat.total / totalMonth) * 100 : 0
          return (
            <div
              key={cat.id}
              className={`p-3 bg-gray-50 rounded-lg ${onCategoryClick ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
              onClick={() => onCategoryClick?.(cat)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                  <span className="font-medium text-gray-700">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-gray-500">
                    {pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                  </span>
                  <span className="font-bold text-gray-800 text-right">
                    R$ {cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`${cat.color} h-1.5 rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
        {smallCategories.length > 0 && (
          <div
            className={`p-3 bg-gray-50 rounded-lg ${onOthersClick ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
            onClick={() => onOthersClick?.(smallCategories.map(c => c.id))}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="font-medium text-gray-700">Outros</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-medium text-gray-500">
                  {(totalMonth > 0 ? (othersTotal / totalMonth) * 100 : 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </span>
                <span className="font-bold text-gray-800 text-right">
                  R$ {othersTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
              <div
                className="bg-gray-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${totalMonth > 0 ? (othersTotal / totalMonth) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 leading-snug">{othersDescription}</p>
          </div>
        )}
      </div>
    </div>
  )
}