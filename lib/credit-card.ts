// BalançoTotal — Credit-card billing-cycle logic (pure, no I/O)
//
// Given a purchase date and a card's closing/due day, computes which monthly
// invoice (fatura) the purchase belongs to. Uses native Date only, matching the
// rest of the project (no date library).

export type InvoiceCycle = {
  /** 'YYYY-MM' of the due date — the month users think of as "the invoice". */
  reference_month: string
  /** 'YYYY-MM-DD' the invoice closes. */
  closing_date: string
  /** 'YYYY-MM-DD' the invoice is due. */
  due_date: string
}

/** Number of days in a given month (month0 is 0-indexed). */
function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
}

/** Adds `delta` months to (year, month0), normalizing the result. */
function addMonths(year: number, month0: number, delta: number): { year: number; month0: number } {
  const total = year * 12 + month0 + delta
  return { year: Math.floor(total / 12), month0: ((total % 12) + 12) % 12 }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function fmtDate(year: number, month0: number, day: number): string {
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`
}

/**
 * Resolves the invoice cycle a purchase on `dateISO` ('YYYY-MM-DD') falls into.
 *
 * - Closing: the purchase lands on the first closing date >= the purchase date.
 *   If the day of month is on/before the closing day it closes this month,
 *   otherwise next month (a purchase after closing goes to the next invoice).
 * - Due: if dueDay <= closingDay the invoice is due the month AFTER closing
 *   (e.g. closes on the 28th, pays on the 5th); otherwise it is due in the SAME
 *   month as closing (e.g. closes on the 5th, pays on the 20th).
 * - Days beyond the month length (e.g. day 31 in February) clamp to the last day.
 */
export function invoiceCycleForDate(dateISO: string, closingDay: number, dueDay: number): InvoiceCycle {
  const [y, m] = dateISO.slice(0, 10).split('-').map(Number)
  const d = Number(dateISO.slice(8, 10))
  const m0 = m - 1

  const closingThisMonth = Math.min(closingDay, daysInMonth(y, m0))
  const closing = d <= closingThisMonth ? { year: y, month0: m0 } : addMonths(y, m0, 1)
  const closingDayClamped = Math.min(closingDay, daysInMonth(closing.year, closing.month0))

  const due = dueDay <= closingDay
    ? addMonths(closing.year, closing.month0, 1)
    : { year: closing.year, month0: closing.month0 }
  const dueDayClamped = Math.min(dueDay, daysInMonth(due.year, due.month0))

  return {
    reference_month: `${due.year}-${pad2(due.month0 + 1)}`,
    closing_date: fmtDate(closing.year, closing.month0, closingDayClamped),
    due_date: fmtDate(due.year, due.month0, dueDayClamped),
  }
}
