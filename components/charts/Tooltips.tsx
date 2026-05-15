import { fmt } from './helpers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-red-600 font-bold">{fmt(payload[0].value)}</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700">{payload[0].name}</p>
      <p className="font-bold" style={{ color: payload[0].payload.fill }}>{fmt(payload[0].value)}</p>
      <p className="text-gray-500">
        {(payload[0].payload.percent * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
      </p>
    </div>
  )
}
