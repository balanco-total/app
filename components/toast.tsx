'use client'

import { useState, useRef } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'error' | 'success' | 'warn'
export type Toast = { id: number; type: ToastType; msg: string }

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = (type: ToastType, msg: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  const toast = {
    error:   (msg: string) => show('error', msg),
    success: (msg: string) => show('success', msg),
    warn:    (msg: string) => show('warn', msg),
  }

  return { toasts, toast, dismiss }
}

const STYLES: Record<ToastType, { bar: string; icon: React.ReactNode }> = {
  error:   { bar: 'border-l-red-500',    icon: <XCircle    size={17} className="shrink-0 text-red-500" /> },
  success: { bar: 'border-l-green-500',  icon: <CheckCircle size={17} className="shrink-0 text-green-500" /> },
  warn:    { bar: 'border-l-yellow-500', icon: <AlertTriangle size={17} className="shrink-0 text-yellow-500" /> },
}

export function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 bg-white dark:bg-gray-800 border border-l-4 ${STYLES[t.type].bar} border-gray-100 dark:border-gray-700 px-4 py-3 rounded-xl shadow-lg max-w-xs pointer-events-auto`}
        >
          {STYLES[t.type].icon}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1 leading-snug">{t.msg}</span>
          <button onClick={() => dismiss(t.id)} className="ml-1 text-gray-300 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300 transition shrink-0">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

export type ConfirmOptions = {
  title: string
  body?: string
  confirmLabel?: string
  onConfirm: () => void
}

type ConfirmState = ConfirmOptions & { open: boolean }

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '', onConfirm: () => {} })
  const callbackRef = useRef<() => void>(() => {})

  const showConfirm = (opts: ConfirmOptions) => {
    callbackRef.current = opts.onConfirm
    setState({ ...opts, open: true })
  }

  const handleConfirm = () => {
    setState(s => ({ ...s, open: false }))
    callbackRef.current()
  }

  const handleCancel = () => setState(s => ({ ...s, open: false }))

  return { confirmState: state, showConfirm, handleConfirm, handleCancel }
}

export function ConfirmModal({
  open, title, body, confirmLabel = 'Confirmar', onConfirm, onCancel,
}: ConfirmState & { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
      {body && <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{body}</p>}
      {!body && <div className="mb-5" />}
      <div className="flex gap-3">
        <Button variant="destructive" size="md" onClick={onConfirm} className="flex-1">
          {confirmLabel}
        </Button>
        <Button variant="secondary" size="md" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </Modal>
  )
}
