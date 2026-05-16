import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { PieTooltip } from './Tooltips'
import type { PieEntry } from './types'

export default function CategoryPieChart({
  data,
  onCategoryClick,
}: {
  data: PieEntry[]
  onCategoryClick?: (name: string) => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Despesas por categoria</h2>
      {onCategoryClick && data.length > 0 && (
        <p className="text-xs text-gray-400 mb-3">Clique em uma categoria para ver as despesas</p>
      )}
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-72 text-gray-400 text-sm">
          Nenhuma despesa neste mês.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              outerRadius={110}
              innerRadius={50}
              dataKey="value"
              label={({ percent }: { percent?: number }) =>
                (percent ?? 0) >= 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
              }
              labelLine={false}
              onClick={(entry: { name?: string }) => { if (entry.name) onCategoryClick?.(entry.name) }}
              style={{ cursor: onCategoryClick ? 'pointer' : undefined }}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend formatter={(value) => <span className="text-xs text-gray-700">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
