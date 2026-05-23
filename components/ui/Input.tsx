'use client'

import { InputHTMLAttributes, forwardRef, useId } from 'react'

type Variant = 'default' | 'danger'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  variant?: Variant
}

const RING: Record<Variant, string> = {
  default: 'focus:ring-brand-500',
  danger:  'focus:ring-red-500',
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, variant = 'default', id, className = '', ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const ring = error ? RING.danger : RING[variant]
  const borderColor = error ? 'border-red-400' : 'border-gray-300'

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full px-4 py-2 border ${borderColor} rounded-lg focus:ring-2 ${ring} focus:border-transparent ${className}`.trim()}
        {...rest}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
})

export default Input
