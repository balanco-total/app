'use client'

import type { FinancialAccount, CreditCardOption } from './types'

type Props = {
  banks: FinancialAccount[]
  cards: Pick<CreditCardOption, 'id' | 'description'>[]
  /** Encoded value: `bank:<id>` or `card:<id>`. */
  value: string
  onChange: (value: string) => void
  className?: string
}

const SELECT_CLASS =
  'w-full px-4 py-2 border border-gray-300 dark:border-white/[0.14] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-700 dark:bg-dm-field dark:text-dm-text'

/** Combined bank-account + credit-card picker. Value encodes the source kind. */
export default function AccountSelect({ banks, cards, value, onChange, className }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={className ?? SELECT_CLASS}
    >
      {banks.length > 0 && (
        <optgroup label="Contas">
          {banks.map(acc => (
            <option key={acc.id} value={`bank:${acc.id}`}>
              {acc.name}{acc.is_default ? ' (padrão)' : ''}
            </option>
          ))}
        </optgroup>
      )}
      {cards.length > 0 && (
        <optgroup label="Cartões">
          {cards.map(card => (
            <option key={card.id} value={`card:${card.id}`}>
              {card.description}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}

/** Splits an encoded AccountSelect value into its kind and id. */
export function parseSource(value: string): { kind: 'bank' | 'card' | ''; id: string } {
  const [kind, id] = value.split(':')
  if (kind === 'bank' || kind === 'card') return { kind, id: id ?? '' }
  return { kind: '', id: '' }
}
