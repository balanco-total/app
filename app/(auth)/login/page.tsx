'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import Logo from '@/components/Logo'
import PasswordInput from '@/components/PasswordInput'

const MAX_EMAIL = 100
const MAX_PASSWORD = 40

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [view, setView] = useState<'login' | 'recovery'>('login')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (email.length > MAX_EMAIL) { setError(`E-mail deve ter no máximo ${MAX_EMAIL} caracteres.`); return }
    if (password.length > MAX_PASSWORD) { setError(`Senha deve ter no máximo ${MAX_PASSWORD} caracteres.`); return }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha inválidos.')
      setLoading(false)
      return
    }

    router.push('/app')
    router.refresh()
  }

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecoveryLoading(true)

    // Rate-limited server route — never reveals whether the email exists
    await fetch('/api/auth/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: recoveryEmail.trim().toLowerCase() }),
    })

    setRecoverySent(true)
    setRecoveryLoading(false)
  }

  const switchToRecovery = () => {
    setView('recovery')
    setRecoveryEmail(email) // pre-fill if already typed
    setRecoverySent(false)
    setError('')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-center mb-4"><Logo /></div>

        {view === 'recovery' ? (
          <>
            <p className="text-gray-500 text-center mb-6">Recuperar senha</p>

            {recoverySent ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium">E-mail enviado</p>
                <p className="text-sm text-gray-500">
                  Se este e-mail estiver cadastrado, você receberá um link em breve. Verifique sua caixa de entrada e a pasta de spam.
                </p>
                <button
                  onClick={() => { setView('login'); setRecoverySent(false) }}
                  className="text-[#1B4332] font-semibold hover:underline text-sm"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecovery} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    required
                    autoFocus
                    maxLength={MAX_EMAIL}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full bg-[#1B4332] text-white py-3 rounded-lg font-semibold hover:bg-[#163a2b] transition disabled:opacity-50"
                >
                  {recoveryLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm transition"
                >
                  Voltar ao login
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <p className="text-gray-500 text-center mb-6">Faça login</p>

            {message === 'confirm-email' && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm mb-6">
                Conta criada com sucesso! Acesse sua caixa de e-mail e clique no link de confirmação antes de fazer login.
              </div>
            )}
            {message === 'password-reset' && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
                Senha atualizada com sucesso. Faça login com sua nova senha.
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  maxLength={MAX_EMAIL}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Senha</label>
                  <button
                    type="button"
                    onClick={switchToRecovery}
                    className="text-xs text-[#1B4332] hover:text-[#163a2b] hover:underline transition"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  maxLength={MAX_PASSWORD}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B4332] text-white py-3 rounded-lg font-semibold hover:bg-[#163a2b] transition disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-600">
              Não tem conta?{' '}
              <Link href="/signup" className="text-[#1B4332] font-semibold hover:underline">
                Cadastre-se
              </Link>
            </p>
            <p className="mt-3 text-center">
              <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition">
                Conheça o BalançoTotal
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
