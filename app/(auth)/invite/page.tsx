'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import PasswordInput from '@/components/PasswordInput'

const MAX_NAME = 60
const MAX_PASSWORD = 40

function InviteForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) { setIsValid(false); setLoading(false); return }

    supabase.rpc('get_invite_by_token', { p_token: token }).then(({ data }) => {
      if (!data || data.length === 0) {
        setIsValid(false)
      } else {
        setEmail(data[0].email)
        setOwnerEmail(data[0].owner_email ?? '')
        setIsValid(data[0].is_valid)
      }
      setLoading(false)
    })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (name.trim().length === 0) { setError('Nome é obrigatório.'); return }
    if (name.trim().length > MAX_NAME) { setError(`Nome deve ter no máximo ${MAX_NAME} caracteres.`); return }
    if (password.length > MAX_PASSWORD) { setError(`Senha deve ter no máximo ${MAX_PASSWORD} caracteres.`); return }

    setSubmitting(true)

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    const json = await res.json()

    if (!res.ok) {
      const msg = json.error ?? ''
      setError(
        msg.toLowerCase().includes('already registered')
          ? 'Este e-mail já possui uma conta. Faça login com suas credenciais existentes.'
          : msg || 'Erro ao criar conta.'
      )
      setSubmitting(false)
      return
    }

    router.push('/login?message=confirm-email')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Logo />
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Convite inválido</h1>
          <p className="text-gray-500 mb-6">
            Este link de convite é inválido, já foi utilizado ou expirou.
          </p>
          <Link href="/login" className="text-[#1B4332] font-semibold hover:underline">
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-center mb-4"><Logo /></div>
        <p className="text-gray-500 text-center mb-1">Você foi convidado!</p>
        <p className="text-center text-sm text-gray-400 mb-8">
          Conta vinculada a <span className="font-medium text-gray-600">{ownerEmail}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              maxLength={MAX_NAME}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              placeholder="Como quer ser chamado"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              maxLength={MAX_PASSWORD}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1B4332] text-white py-3 rounded-lg font-semibold hover:bg-[#163a2b] transition disabled:opacity-50"
          >
            {submitting ? 'Criando conta...' : 'Entrar na conta'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense>
      <InviteForm />
    </Suspense>
  )
}
