import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendMail } from '@/lib/email'
import { renderDueThisWeekEmail, DueThisWeekExpense } from '@/lib/expenses-due-this-week'

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

  const { data: expenses, error: expensesError } = await admin.rpc('get_expenses_due_this_week')

  if (expensesError) {
    console.error('[cron/due-this-week] failed to fetch expenses:', expensesError)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }

  const rows = (expenses ?? []) as ExpenseRow[]
  if (rows.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, accounts: 0 })
  }

  const byAccount = new Map<string, DueThisWeekExpense[]>()
  for (const row of rows) {
    const list = byAccount.get(row.account_id) ?? []
    list.push({ id: row.id, description: row.description, amount: row.amount, date: row.date })
    byAccount.set(row.account_id, list)
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
