import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { BarTooltip } from './Tooltips'
import { FALLBACK_COLORS, fmtAxis } from './helpers'
import type { UserBarEntry } from './types'

export default function UserBarChart({ data }: { data: UserBarEntry[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Lançamentos por usuário</h2>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-72 text-gray-400 text-sm">
          Nenhuma despesa neste mês.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#6b7280' }} width={60} />
            <Tooltip content={<BarTooltip />} cursor={false} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={80}>
              {data.map((_, i) => (
                <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
