'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { BarTooltip } from './Tooltips'
import { fmtAxis } from './helpers'
import { useTheme } from '@/contexts/ThemeContext'
import type { TrendEntry } from './types'

export default function MonthlyTrendChart({ data }: { data: TrendEntry[] }) {
  const { theme } = useTheme()
  const gridStroke = theme === 'dark' ? '#374151' : '#f3f4f6'
  const tickFill = theme === 'dark' ? '#9ca3af' : '#6b7280'

  return (
    <div className="bg-white dark:bg-dm-card rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-dm-text mb-4">Evolução mensal</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickFill }} />
          <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: tickFill }} width={60} />
          <Tooltip content={<BarTooltip />} cursor={false} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={60}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isCurrent ? '#ef4444' : '#fecaca'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
