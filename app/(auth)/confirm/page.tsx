import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: { token_hash?: string; type?: string; code?: string }
}) {
  const { token_hash, type, code } = searchParams

  let confirmed = false

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) confirmed = true
  } else if (token_hash && type === 'signup') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'signup',
    })
    if (!error) confirmed = true
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        {confirmed ? (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Conta confirmada!</h1>
            <p className="text-gray-500 mb-8">
              Seu e-mail foi verificado com sucesso. Você já pode começar a usar o BalançoTotal.
            </p>
            <Link
              href="/app"
              className="inline-block w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Adicionar minha primeira despesa
            </Link>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Link inválido ou expirado</h1>
            <p className="text-gray-500 mb-8">
              Este link de confirmação não é válido ou já expirou. Tente criar uma nova conta.
            </p>
            <Link
              href="/signup"
              className="inline-block w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Criar nova conta
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
