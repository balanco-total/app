'use client'

import Link from 'next/link'
import { CreditCard, PlusCircle, Pencil, Trash2, Receipt } from 'lucide-react'
import { formatBRL } from '@/lib/utils'
import type { CreditCardWithUsage } from './types'

type Props = {
  cards: CreditCardWithUsage[]
  showForm: boolean
  onCreate: () => void
  onEdit: (card: CreditCardWithUsage) => void
  onDelete: (card: CreditCardWithUsage) => void
}

export default function CardList({ cards, showForm, onCreate, onEdit, onDelete }: Props) {
  if (cards.length === 0 && !showForm) {
    return (
      <div className="text-center py-12">
        <CreditCard size={40} className="text-gray-300 dark:text-dm-faint mx-auto mb-3" />
        <p className="text-gray-500 dark:text-dm-muted text-sm">Nenhum cartão cadastrado ainda.</p>
        <p className="text-gray-400 dark:text-dm-muted text-xs mt-1">Adicione um cartão para lançar compras nas faturas.</p>
        <button
          onClick={onCreate}
          className="mt-4 flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition text-sm font-medium mx-auto"
        >
          <PlusCircle size={16} />
          Criar primeiro cartão
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {cards.map(card => {
        const available = Math.max(0, card.credit_limit - card.used)
        const pct = card.credit_limit > 0 ? Math.min(100, Math.round((card.used / card.credit_limit) * 100)) : 0
        return (
          <div
            key={card.id}
            className="p-4 rounded-xl border border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-dm-surface"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gray-200 dark:bg-dm-field">
                  <CreditCard size={16} className="text-gray-500 dark:text-dm-muted" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-gray dark:text-white">{card.description}</span>
                  <p className="text-xs text-gray-500 dark:text-dm-muted mt-0.5">
                    Fecha dia {card.closing_day} • Vence dia {card.due_day}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/cards/${card.id}`}
                  title="Ver faturas"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-dm-muted hover:bg-white dark:hover:bg-dm-field hover:text-brand-600 border border-transparent transition"
                >
                  <Receipt size={13} />
                  <span className="hidden sm:inline">Faturas</span>
                </Link>
                <button
                  onClick={() => onEdit(card)}
                  title="Editar cartão"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-dm-text hover:bg-white dark:hover:bg-dm-field transition"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onDelete(card)}
                  title="Excluir cartão"
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-white dark:hover:bg-dm-field transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Limit usage bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dm-muted mb-1">
                <span>Usado: {formatBRL(card.used)}</span>
                <span>Disponível: {formatBRL(available)}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-dm-field overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-brand-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-dm-muted mt-1">Limite: {formatBRL(card.credit_limit)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
