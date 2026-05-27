'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { PieTooltip } from './Tooltips'
import { useTheme } from '@/contexts/ThemeContext'
import type { PieEntry } from './types'

export default function AccountPieChart({ data }: { data: PieEntry[] }) {
  const { theme } = useTheme()
  const legendTextColor = theme === 'dark' ? '#d1d5db' : '#374151'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Lançamentos por conta</h2>
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
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend formatter={(value) => <span className="text-xs" style={{ color: legendTextColor }}>{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
