import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: { verified?: string; token_hash?: string; type?: string }
}) {
  const { verified, token_hash, type } = searchParams

  let confirmed = verified === '1'

  // Fallback: token_hash flow (non-PKCE)
  if (!confirmed && token_hash && type === 'signup') {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'signup' })
    if (!error) confirmed = true
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
        {confirmed ? (
          <>
            <div className="flex justify-center my-8">
              <Logo />
            </div>
            <h1 className="text-2xl text-gray-900 dark:text-gray-100 mb-2">Conta confirmada!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Seu e-mail foi verificado com sucesso. Você já pode começar a usar o BalançoTotal.
            </p>
            <Link
              href="/"
              className="inline-block w-full bg-brand-500 hover:bg-[#14532d] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Dashboard
            </Link>
          </>
        ) : (
          <>
            <div className="flex justify-center my-8">
              <Logo />
            </div>
            <h1 className="text-2xl text-gray-900 dark:text-gray-100 mb-2">Link inválido ou expirado</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Este link de confirmação não é válido ou já expirou. Tente criar uma nova conta.
            </p>
            <Link
              href="/signup"
              className="inline-block w-full bg-brand-500 hover:bg-[#14532d] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Criar nova conta
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
