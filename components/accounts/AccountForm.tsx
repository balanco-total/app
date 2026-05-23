'use client'

import { useState } from 'react'
import { applyMask, parseMasked } from './helpers'
import type { FinancialAccount } from './types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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
        <Input
          label="Nome"
          type="text"
          maxLength={60}
          value={formName}
          onChange={e => setFormName(e.target.value)}
          placeholder="Ex: Nubank, Caixa, Carteira"
          autoFocus
          className="text-sm"
        />
        <Input
          label="Descrição (opcional)"
          type="text"
          maxLength={120}
          value={formDescription}
          onChange={e => setFormDescription(e.target.value)}
          placeholder="Ex: Conta corrente principal"
          className="text-sm"
        />
        <Input
          label="Saldo inicial (R$)"
          type="text"
          inputMode="numeric"
          value={formBalance}
          onChange={e => setFormBalance(applyMask(e.target.value))}
          placeholder="0,00"
          className="text-sm"
        />
        <div className="flex gap-3 pt-1">
          <Button
            size="md"
            onClick={handleSave}
            isLoading={saving}
            className="flex-1 text-sm"
          >
            {saving ? 'Salvando…' : editingAccount ? 'Salvar alterações' : 'Criar conta'}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={onCancel}
            className="flex-1 text-sm"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
