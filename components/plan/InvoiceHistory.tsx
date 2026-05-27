import { Receipt, ExternalLink } from 'lucide-react'
import { formatDate, formatCurrency, statusLabel } from './helpers'
import type { Invoice } from './types'

export default function InvoiceHistory({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-1.5">
        <Receipt size={15} />
        Histórico de cobranças
      </h2>

      {invoices.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          Nenhuma cobrança registrada ainda.
        </p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-2">
            {invoices.map(inv => {
              const s = statusLabel(inv.status)
              return (
                <div key={inv.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Período</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                      </p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(inv.amount)}</p>
                    {inv.hosted_invoice_url && (
                      <a
                        href={inv.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        Ver fatura <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Período</th>
                  <th className="text-right px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                  <th className="text-center px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const s = statusLabel(inv.status)
                  return (
                    <tr key={inv.id} className={i > 0 ? 'border-t border-gray-50 dark:border-gray-700' : ''}>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-100">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.hosted_invoice_url && (
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                          >
                            Ver <ExternalLink size={12} />
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
