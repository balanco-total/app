import { escapeHtml } from './email'
import { formatBRL } from './utils'

export type DueThisWeekExpense = {
  id: string
  description: string
  amount: number
  date: string
}

export type RenderDueThisWeekInput = {
  accountName: string
  memberName: string
  expenses: DueThisWeekExpense[]
}

function formatDueDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

export function renderDueThisWeekEmail({ memberName, expenses }: RenderDueThisWeekInput) {
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date))
  const total = sorted.reduce((sum, e) => sum + Number(e.amount), 0)
  const count = sorted.length
  const subject = `BalançoTotal - Suas despesas para pagar esta semana (${count})`

  const lines = sorted
    .map(e => `- ${formatDueDate(e.date)} — ${e.description}: ${formatBRL(Number(e.amount))}`)
    .join('\n')
  const text = [
    `Olá, ${memberName}!`,
    '',
    `Suas despesas para pagar esta semana:`,
    '',
    lines,
    '',
    `Total: ${formatBRL(total)}`,
    '',
    'BalançoTotal',
  ].join('\n')

  const rows = sorted
    .map(
      e => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">${formatDueDate(e.date)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(e.description)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; white-space: nowrap;">${formatBRL(Number(e.amount))}</td>
        </tr>
      `,
    )
    .join('')

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111827; max-width: 600px; margin: 0 auto;">
      <p>Olá, <strong>${escapeHtml(memberName)}</strong>!</p>
      <p>Suas despesas para pagar esta semana:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Vencimento</th>
            <th style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Descrição</th>
            <th style="padding: 8px 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Valor</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 8px 12px; text-align: right; font-weight: 600;">Total</td>
            <td style="padding: 8px 12px; text-align: right; font-weight: 600; white-space: nowrap;">${formatBRL(total)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="color: #6b7280; font-size: 12px;">BalançoTotal</p>
    </div>
  `

  return { subject, text, html }
}
