export type RecurringExpense = {
  id: string
  account_id: string
  user_id: string
  description: string
  amount: number
  category_id: string | null
  financial_account_id: string | null
  day_of_month: number
  start_year_month: string   // "YYYY-MM"
  end_year_month: string | null
  created_at: string
}

export type VirtualExpense = {
  _virtual: true
  id: string                  // "virtual:<recurring_expense_id>:<YYYY-MM>"
  recurring_expense_id: string
  occurrence_year_month: string
  account_id: string
  user_id: string
  description: string
  amount: number
  category_id: string | null
  financial_account_id: string | null
  date: string                // "YYYY-MM-DD" (day_of_month clamped to month length)
  paid_at: null
  skipped: false
  created_at: string
  profiles: { name: string } | null
}

/** Returns the ISO date string for an occurrence, clamping day_of_month to the last valid day. */
export function occurrenceDate(yearMonth: string, dayOfMonth: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const d = Math.min(dayOfMonth, lastDay)
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function isTemplateActiveInMonth(template: RecurringExpense, yearMonth: string): boolean {
  if (yearMonth < template.start_year_month) return false
  if (template.end_year_month && yearMonth > template.end_year_month) return false
  return true
}

/**
 * Generates virtual occurrences for templates that have no materialized row for the given month.
 * Pass materializedKeys as a Set of "<recurring_expense_id>:<YYYY-MM>" strings built from
 * the real expenses already fetched for that month.
 */
export function generateVirtualOccurrences(
  templates: RecurringExpense[],
  yearMonth: string,
  materializedKeys: Set<string>,
): VirtualExpense[] {
  return templates
    .filter(t => isTemplateActiveInMonth(t, yearMonth))
    .filter(t => !materializedKeys.has(`${t.id}:${yearMonth}`))
    .map(t => ({
      _virtual: true as const,
      id: `virtual:${t.id}:${yearMonth}`,
      recurring_expense_id: t.id,
      occurrence_year_month: yearMonth,
      account_id: t.account_id,
      user_id: t.user_id,
      description: t.description,
      amount: t.amount,
      category_id: t.category_id,
      financial_account_id: t.financial_account_id,
      date: occurrenceDate(yearMonth, t.day_of_month),
      paid_at: null,
      skipped: false as const,
      created_at: t.created_at,
      profiles: null,
    }))
}
