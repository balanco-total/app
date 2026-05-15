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
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="hidden sm:block text-gray-600 mt-0.5 text-sm sm:text-base">Análise visual das suas despesas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => onShift(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500" title="Mês anterior">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 border border-red-200 rounded-lg min-w-[160px] justify-center">
              <Calendar size={15} className="text-red-500 shrink-0" />
              <span className="text-sm font-semibold text-red-700">{MONTHS_PT[selMonthNum - 1]} {selYear}</span>
            </div>
            <button onClick={() => onShift(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500" title="Próximo mês">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="text-right shrink-0 pl-2 border-l border-gray-200">
            <p className="text-xs text-gray-500">Total do mês</p>
            <p className="text-lg sm:text-xl font-bold text-red-600">{fmt(totalMonth)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
