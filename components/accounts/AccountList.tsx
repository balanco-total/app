'use client'

import { Landmark, PlusCircle, Pencil, Trash2, Star } from 'lucide-react'
import type { FinancialAccount } from './types'

type Props = {
  financialAccounts: FinancialAccount[]
  showForm: boolean
  onCreate: () => void
  onEdit: (acc: FinancialAccount) => void
  onDelete: (acc: FinancialAccount) => void
  onSetDefault: (id: string) => void
}

export default function AccountList({ financialAccounts, showForm, onCreate, onEdit, onDelete, onSetDefault }: Props) {
  if (financialAccounts.length === 0 && !showForm) {
    return (
      <div className="text-center py-12">
        <Landmark size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Nenhuma conta cadastrada ainda.</p>
        <p className="text-gray-400 text-xs mt-1">Adicione uma conta para associar aos seus lançamentos.</p>
        <button
          onClick={onCreate}
          className="mt-4 flex items-center gap-2 bg-[#1B4332] text-white px-4 py-2 rounded-lg hover:bg-[#14332a] transition text-sm font-medium mx-auto"
        >
          <PlusCircle size={16} />
          Criar primeira conta
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {financialAccounts.map(acc => (
        <div
          key={acc.id}
          className={`p-4 rounded-xl border transition ${acc.is_default ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${acc.is_default ? 'bg-green-100' : 'bg-gray-200'}`}>
                <Landmark size={16} className={acc.is_default ? 'text-green-600' : 'text-gray-500'} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{acc.name}</span>
                  {acc.is_default && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <Star size={10} />
                      padrão
                    </span>
                  )}
                </div>
                {acc.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{acc.description}</p>
                )}
                <p className="text-sm font-semibold text-gray-700 mt-1">
                  R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!acc.is_default && financialAccounts.length > 1 && (
                <button
                  onClick={() => onSetDefault(acc.id)}
                  title="Tornar padrão"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-white hover:text-green-700 hover:border-green-200 border border-transparent transition"
                >
                  <Star size={13} />
                  <span className="hidden sm:inline">Tornar padrão</span>
                </button>
              )}
              <button
                onClick={() => onEdit(acc)}
                title="Editar conta"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => onDelete(acc)}
                title="Excluir conta"
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-white transition"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
