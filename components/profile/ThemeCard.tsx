'use client'

import { Palette, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function ThemeCard() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Escuro', icon: Moon },
  ]

  return (
    <div className="bg-white dark:bg-dm-card rounded-2xl shadow-lg p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-800 dark:text-dm-text flex items-center gap-2">
        <Palette size={20} className="text-brand-500 dark:text-brand-200" />
        Aparência
      </h2>
      <p className="text-sm text-gray-500 dark:text-dm-muted">
        Escolha o tema da interface. A preferência fica salva neste dispositivo.
      </p>
      <div
        role="radiogroup"
        aria-label="Tema"
        className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-dm-field rounded-lg"
      >
        {options.map(({ value, label, icon: Icon }) => {
          const active = theme === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                active
                  ? 'bg-white dark:bg-dm-card text-brand-500 dark:text-brand-300 shadow-sm'
                  : 'text-gray-600 dark:text-dm-muted hover:text-gray-800 dark:hover:text-dm-text'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
