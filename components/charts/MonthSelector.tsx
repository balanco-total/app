import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS_PT, fmt } from './helpers'

export default function MonthSelector({
  selectedMonth,
  onShift,
  totalMonth,
}: {
  selectedMonth: string
  onShift: (delta: number) => void
  totalMonth: number
}) {
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)

  return (
    <div className="bg-white dark:bg-dm-card rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => onShift(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dm-field transition text-gray-500 dark:text-dm-muted" title="Mês anterior">
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-1 sm:flex-none items-center gap-2 px-4 py-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-lg sm:min-w-[160px] justify-center">
            <Calendar size={15} className="text-red-500 shrink-0" />
            <span className="text-sm font-semibold text-red-700 whitespace-nowrap">{MONTHS_PT[selMonthNum - 1]} {selYear}</span>
          </div>
          <button onClick={() => onShift(1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dm-field transition text-gray-500 dark:text-dm-muted" title="Próximo mês">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-2 pt-2 sm:pt-0 sm:pl-3">
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-500 dark:text-dm-muted">Despesas do mês</p>
            <p className="text-lg sm:text-xl font-bold text-red-600 whitespace-nowrap">{fmt(totalMonth)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
