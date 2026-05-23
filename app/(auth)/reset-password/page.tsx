'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PasswordInput from '@/components/PasswordInput'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

const MAX_PASSWORD = 40

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [status, setStatus] = useState<'waiting' | 'ready' | 'invalid'>('waiting')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready')
      }
    })

    const timeout = setTimeout(() => {
      setStatus(s => s === 'waiting' ? 'invalid' : s)
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return }
    if (password.length > MAX_PASSWORD) { setError(`A senha deve ter no máximo ${MAX_PASSWORD} caracteres.`); return }
    if (password !== confirm) { setError('As senhas não conferem.'); return }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Erro ao atualizar senha. O link pode ter expirado.')
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.push('/login?message=password-reset')
  }

  if (status === 'waiting') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-xl text-gray-600">Verificando link...</div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card shadow="xl" padding="lg" className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Link inválido ou expirado</h1>
          <p className="text-gray-500 mb-6">
            Este link de recuperação é inválido ou já expirou. Solicite um novo.
          </p>
          <Link href="/login" className="text-brand-500 font-semibold hover:underline">
            Voltar ao login
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card shadow="xl" padding="lg" className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">BalançoTotal</h1>
        <p className="text-gray-500 text-center mb-6">Criar nova senha</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nova senha</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              minLength={6}
              maxLength={MAX_PASSWORD}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar nova senha</label>
            <PasswordInput
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={6}
              maxLength={MAX_PASSWORD}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={loading}
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
