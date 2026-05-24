import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendMail } from '@/lib/email'
import { renderDueThisWeekEmail, DueThisWeekExpense } from '@/lib/expenses-due-this-week'
import { generateDueOccurrencesInWindow, RecurringExpense } from '@/lib/recurring'

export const dynamic = 'force-dynamic'

type ExpenseRow = {
  id: string
  account_id: string
  description: string
  amount: number
  date: string
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/due-this-week] CRON_SECRET missing')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // UTC window [today - 2, today + 6] — same semantics as the legacy get_expenses_due_this_week RPC.
  const now = new Date()
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2))
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 6))
  const startStr = startDate.toISOString().slice(0, 10)
  const endStr = endDate.toISOString().slice(0, 10)
  const startMonth = startStr.slice(0, 7)
  const endMonth = endStr.slice(0, 7)

  const { data: expenses, error: expensesError } = await admin
    .from('expenses')
    .select('id, account_id, description, amount, date, paid_at')
    .is('paid_at', null)
    .eq('skipped', false)
    .gte('date', `${startStr}T00:00:00.000Z`)
    .lte('date', `${endStr}T23:59:59.999Z`)

  if (expensesError) {
    console.error('[cron/due-this-week] failed to fetch expenses:', expensesError)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }

  const rows = (expenses ?? []) as ExpenseRow[]

  const { data: rawTemplates, error: templatesError } = await admin
    .from('recurring_expenses')
    .select('*')
    .lte('start_year_month', endMonth)

  if (templatesError) {
    console.error('[cron/due-this-week] failed to fetch recurring templates:', templatesError)
    return NextResponse.json({ error: 'Failed to fetch recurring templates' }, { status: 500 })
  }

  const templates = ((rawTemplates ?? []) as RecurringExpense[]).filter(
    t => !t.end_year_month || t.end_year_month >= startMonth,
  )

  const { data: materialized, error: materializedError } = await admin
    .from('expenses')
    .select('recurring_expense_id, occurrence_year_month')
    .not('recurring_expense_id', 'is', null)
    .gte('date', startStr)
    .lte('date', `${endStr}T23:59:59.999Z`)

  if (materializedError) {
    console.error('[cron/due-this-week] failed to fetch materialized recurring rows:', materializedError)
    return NextResponse.json({ error: 'Failed to fetch materialized rows' }, { status: 500 })
  }

  const materializedKeys = new Set(
    (materialized ?? [])
      .filter(r => r.recurring_expense_id && r.occurrence_year_month)
      .map(r => `${r.recurring_expense_id}:${r.occurrence_year_month}`),
  )

  const virtuals = generateDueOccurrencesInWindow(templates, startStr, endStr, materializedKeys)

  if (rows.length === 0 && virtuals.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, accounts: 0 })
  }

  const byAccount = new Map<string, DueThisWeekExpense[]>()
  for (const row of rows) {
    const list = byAccount.get(row.account_id) ?? []
    list.push({ id: row.id, description: row.description, amount: row.amount, date: row.date })
    byAccount.set(row.account_id, list)
  }
  for (const v of virtuals) {
    const list = byAccount.get(v.account_id) ?? []
    list.push({ id: v.id, description: v.description, amount: v.amount, date: v.date })
    byAccount.set(v.account_id, list)
  }

  let sent = 0
  let failed = 0

  for (const [accountId, accountExpenses] of Array.from(byAccount.entries())) {
    const { data: account, error: accountError } = await admin
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      console.error('[cron/due-this-week] failed to fetch account', accountId, accountError)
      failed += 1
      continue
    }

    const { data: members, error: membersError } = await admin
      .from('profiles')
      .select('id, name')
      .eq('account_id', accountId)
      .eq('is_disabled', false)

    if (membersError) {
      console.error('[cron/due-this-week] failed to fetch members', accountId, membersError)
      failed += 1
      continue
    }

    for (const member of members ?? []) {
      const { data: userResult, error: userError } = await admin.auth.admin.getUserById(member.id)
      const email = userResult?.user?.email
      if (userError || !email) {
        console.error('[cron/due-this-week] failed to fetch email for', member.id, userError)
        failed += 1
        continue
      }

      const { subject, text, html } = renderDueThisWeekEmail({
        accountName: account.name,
        memberName: member.name,
        expenses: accountExpenses,
      })

      try {
        await sendMail({
          to: email,
          subject,
          text,
          html,
          from: 'BalançoTotal <nao-responder@balancototal.com.br>',
        })
        sent += 1
      } catch (err) {
        console.error('[cron/due-this-week] failed to send mail to', email, err)
        failed += 1
      }
    }
  }

  return NextResponse.json({ sent, failed, accounts: byAccount.size })
}
