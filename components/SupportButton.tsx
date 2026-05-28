'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, CheckCircle2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

const CATEGORIES = ['Reclamação', 'Elogio', 'Dúvida', 'Sugestão', 'Bug', 'Outro'] as const
type Category = (typeof CATEGORIES)[number]

const MIN_MESSAGE = 10
const MAX_MESSAGE = 2000

export default function SupportButton() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('Dúvida')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [installVisible, setInstallVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => setInstallVisible(Boolean((e as CustomEvent<boolean>).detail))
    window.addEventListener('install-prompt-visibility', handler)
    return () => window.removeEventListener('install-prompt-visibility', handler)
  }, [])

  function reset() {
    setCategory('Dúvida')
    setMessage('')
    setError('')
    setSent(false)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    reset()
  }

  async function handleSubmit() {
    const trimmed = message.trim()
    if (trimmed.length < MIN_MESSAGE) {
      setError(`Mensagem deve ter ao menos ${MIN_MESSAGE} caracteres.`)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/support/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar mensagem.')
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar mensagem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enviar mensagem ao suporte"
        title="Falar comigo"
        className={`fixed right-2 z-50 h-10 w-10 rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${installVisible ? 'bottom-28' : 'bottom-2'}`}
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title={sent ? 'Mensagem enviada' : 'Falar com o suporte'}
        size="md"
        showClose
        footer={
          sent ? (
            <Button fullWidth onClick={handleClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="secondary" fullWidth onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button fullWidth isLoading={loading} onClick={handleSubmit}>
                Enviar
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <CheckCircle2 size={48} className="text-emerald-500" />
            <p className="text-gray-700 dark:text-dm-muted">Recebemos sua mensagem! Responderemos no seu e-mail em breve.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="support-category" className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">
                Categoria
              </label>
              <select
                id="support-category"
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-white/[0.14] rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm text-gray-700 dark:text-dm-text bg-white dark:bg-dm-field"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="support-message" className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-1.5">
                Mensagem
              </label>
              <textarea
                id="support-message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={loading}
                rows={5}
                maxLength={MAX_MESSAGE}
                placeholder="Conte para a gente..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-white/[0.14] rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm text-gray-700 dark:text-dm-text bg-white dark:bg-dm-field resize-none"
              />
              <div className="text-right text-xs text-gray-400 dark:text-dm-faint">
                {message.length}/{MAX_MESSAGE}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
