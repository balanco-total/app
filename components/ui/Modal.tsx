'use client'

import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

type Size = 'sm' | 'md' | 'lg'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  size?: Size
  children: ReactNode
  footer?: ReactNode
  showClose?: boolean
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export default function Modal({
  open,
  onClose,
  title,
  size = 'sm',
  children,
  footer,
  showClose = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`bg-white dark:bg-dm-card rounded-2xl p-6 ${SIZE_CLASSES[size]} w-full shadow-xl`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between mb-4">
            {title && <h3 className="text-lg font-bold text-gray-800 dark:text-dm-text">{title}</h3>}
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="text-gray-400 hover:text-gray-600 dark:text-dm-faint dark:hover:text-dm-muted transition ml-auto"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        {children}
        {footer && <div className="flex gap-3 mt-6">{footer}</div>}
      </div>
    </div>
  )
}
