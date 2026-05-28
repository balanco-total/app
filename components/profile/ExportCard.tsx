'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Button from '@/components/ui/Button'
import type { ToastApi } from './types'

export default function ExportCard({ accountId, toast }: { accountId: string; toast: ToastApi }) {
  const supabase = createClient()
  const [csvLoading, setCsvLoading] = useState(false)

  const downloadCSV = async () => {
    setCsvLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('date, paid_at, amount, description, categories(name), profiles(name), financial_accounts(name)')
      .eq('account_id', accountId)
      .order('date', { ascending: false })

    if (!data || data.length === 0) {
      toast.warn('Nenhum lançamento encontrado.')
      setCsvLoading(false)
      return
    }

    const headers = ['Data', 'Data de Pagamento', 'Valor', 'Descrição', 'Categoria', 'Conta', 'Usuário']
    const rows = data.map(e => [
      new Date(e.date).toLocaleDateString('pt-BR'),
      e.paid_at ? new Date(e.paid_at as string).toLocaleDateString('pt-BR') : '',
      (e.amount as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      e.description as string,
      ((e.categories as unknown as { name: string } | null)?.name ?? ''),
      ((e.financial_accounts as unknown as { name: string } | null)?.name ?? ''),
      ((e.profiles as unknown as { name: string } | null)?.name ?? ''),
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Lancamentos_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setCsvLoading(false)
  }

  return (
    <div className="bg-white dark:bg-dm-card rounded-2xl shadow-lg p-6">
      <h2 className="text-lg font-bold text-gray-800 dark:text-dm-text flex items-center gap-2 mb-4">
        <Download size={20} className="text-brand-500 dark:text-brand-200" />
        Exportar dados
      </h2>
      <p className="text-sm text-gray-500 dark:text-dm-muted mb-4">
        Baixe todos os lançamentos da conta em formato CSV (compatível com Excel).
        Colunas: data, valor, descrição, categoria, usuário.
      </p>
      <Button
        size="md"
        onClick={downloadCSV}
        isLoading={csvLoading}
        icon={<Download size={18} />}
        className="px-5 font-medium"
      >
        {csvLoading ? 'Gerando CSV...' : 'Baixar CSV'}
      </Button>
    </div>
  )
}
