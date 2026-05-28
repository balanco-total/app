'use client'

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:     'bg-brand-500 text-white hover:bg-brand-600',
  secondary:   'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dm-field dark:text-dm-text dark:hover:bg-dm-hover',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-2',
  md: 'px-4 py-2.5',
  lg: 'px-5 py-3',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    icon,
    disabled,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed'
  const width = fullWidth ? 'w-full' : ''

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`${base} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${width} ${className}`.trim()}
      {...rest}
    >
      {isLoading ? <Loader2 size={18} className="animate-spin" /> : icon}
      {children}
    </button>
  )
})

export default Button
