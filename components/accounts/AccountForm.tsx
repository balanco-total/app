'use client'

import { useState } from 'react'
import { applyMask, parseMasked } from './helpers'
import type { FinancialAccount } from './types'

type Props = {
  editingAccount: FinancialAccount | null
  saving: boolean
  onSave: (name: string, description: string | null, balance: number) => void
  onCancel: () => void
}

export default function AccountForm({ editingAccount, saving, onSave, onCancel }: Props) {
  const [formName, setFormName] = useState(editingAccount?.name ?? '')
  const [formDescription, setFormDescription] = useState(editingAccount?.description ?? '')
  const [formBalance, setFormBalance] = useState(
    editingAccount
      ? editingAccount.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ''
  )

  const handleSave = () => {
    onSave(formName, formDescription.trim() || null, parseMasked(formBalance))
  }

  return (
    <div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        {editingAccount ? 'Editar conta' : 'Nova conta'}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
          <input
            type="text"
            maxLength={60}
            value={formName}
            onChange={e => setFormName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            placeholder="Ex: Nubank, Caixa, Carteira"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição (opcional)</label>
          <input
            type="text"
            maxLength={120}
            value={formDescription}
            onChange={e => setFormDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            placeholder="Ex: Conta corrente principal"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Saldo inicial (R$)</label>
          <input
            type="text"
            inputMode="numeric"
            value={formBalance}
            onChange={e => setFormBalance(applyMask(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            placeholder="0,00"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#1B4332] text-white py-2.5 rounded-lg font-semibold hover:bg-[#14332a] transition disabled:opacity-50 text-sm"
          >
            {saving ? 'Salvando…' : editingAccount ? 'Salvar alterações' : 'Criar conta'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
