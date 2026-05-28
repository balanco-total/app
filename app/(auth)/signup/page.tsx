'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import PasswordInput from '@/components/PasswordInput'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

const MAX_NAME = 60
const MAX_EMAIL = 100
const MAX_PASSWORD = 40

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (name.trim().length === 0) { setError('Nome é obrigatório.'); return }
    if (name.trim().length > MAX_NAME) { setError(`Nome deve ter no máximo ${MAX_NAME} caracteres.`); return }
    if (email.length > MAX_EMAIL) { setError(`E-mail deve ter no máximo ${MAX_EMAIL} caracteres.`); return }
    if (password.length > MAX_PASSWORD) { setError(`Senha deve ter no máximo ${MAX_PASSWORD} caracteres.`); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }

    setLoading(true)

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Erro ao criar conta.')
      setLoading(false)
      return
    }

    router.push('/login?message=confirm-email')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dm-surface flex items-center justify-center p-4">
      <Card shadow="xl" padding="lg" className="max-w-md w-full">
        <div className="flex justify-center mb-4"><Logo /></div>
        <p className="text-gray-500 dark:text-dm-muted text-center mb-8">Crie sua conta</p>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <Input
            label="Nome"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={MAX_NAME}
          />
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            maxLength={MAX_EMAIL}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-2">Senha</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              maxLength={MAX_PASSWORD}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dm-muted mb-2">Confirmar senha</label>
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
            {loading ? 'Criando conta...' : 'Criar conta'}
          </Button>
          <p className="text-xs text-gray-400 dark:text-dm-faint text-center">
            Ao criar sua conta, você concorda com nossa{' '}
            <a href="https://balancototal.com.br/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-dm-muted">Política de Privacidade</a>
            {' '}e{' '}
            <a href="https://balancototal.com.br/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-dm-muted">Termos de Uso</a>.
          </p>
        </form>

        <p className="mt-6 text-center text-gray-600 dark:text-dm-muted">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand-500 dark:text-brand-200 font-semibold hover:underline">
            Fazer login
          </Link>
        </p>
        <p className="mt-3 text-center">
          <a href="https://balancototal.com.br" className="text-xs text-gray-400 dark:text-dm-faint hover:text-gray-600 dark:hover:text-dm-muted hover:underline transition">
            Conheça o BalançoTotal
          </a>
        </p>
      </Card>
    </div>
  )
}
