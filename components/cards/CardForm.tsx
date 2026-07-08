'use client'

import { useState } from 'react'
import { applyMask, parseMasked } from '@/lib/utils'
import { FIELD_PATTERN } from '@/lib/utils'
import type { CreditCard } from './types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type Props = {
  editingCard: CreditCard | null
  saving: boolean
  onSave: (description: string, creditLimit: number, closingDay: number, dueDay: number) => void
  onCancel: () => void
}

export default function CardForm({ editingCard, saving, onSave, onCancel }: Props) {
  const [description, setDescription] = useState(editingCard?.description ?? '')
  const [creditLimit, setCreditLimit] = useState(
    editingCard
      ? editingCard.credit_limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ''
  )
  const [closingDay, setClosingDay] = useState(editingCard ? String(editingCard.closing_day) : '')
  const [dueDay, setDueDay] = useState(editingCard ? String(editingCard.due_day) : '')

  const handleSave = () => {
    onSave(description, parseMasked(creditLimit), parseInt(closingDay, 10), parseInt(dueDay, 10))
  }

  return (
    <div className="mb-6 p-5 bg-gray-50 dark:bg-dm-surface rounded-xl border border-gray-200 dark:border-white/[0.08]">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-dm-muted mb-4">
        {editingCard ? 'Editar cartão' : 'Novo cartão'}
      </h3>
      <div className="space-y-3">
        <Input
          label="Descrição"
          type="text"
          maxLength={60}
          value={description}
          onChange={e => setDescription(e.target.value.replace(FIELD_PATTERN, ''))}
          placeholder="Ex: Nubank, Inter, C6"
          autoFocus
          className="text-sm"
        />
        <Input
          label="Limite de crédito (R$)"
          type="text"
          inputMode="numeric"
          value={creditLimit}
          onChange={e => setCreditLimit(applyMask(e.target.value))}
          placeholder="0,00"
          className="text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Dia de fechamento"
            type="number"
            min={1}
            max={31}
            value={closingDay}
            onChange={e => setClosingDay(e.target.value)}
            placeholder="Ex: 28"
            className="text-sm"
          />
          <Input
            label="Dia de vencimento"
            type="number"
            min={1}
            max={31}
            value={dueDay}
            onChange={e => setDueDay(e.target.value)}
            placeholder="Ex: 5"
            className="text-sm"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <Button size="md" onClick={handleSave} isLoading={saving} className="flex-1 text-sm">
            {saving ? 'Salvando…' : editingCard ? 'Salvar alterações' : 'Criar cartão'}
          </Button>
          <Button variant="secondary" size="md" onClick={onCancel} className="flex-1 text-sm">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
