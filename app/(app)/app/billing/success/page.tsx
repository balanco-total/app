import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default async function BillingSuccessPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Assinatura confirmada!</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Seu pagamento foi processado e sua assinatura está ativa.
          Pode levar alguns instantes para atualizar.
        </p>
        <Link
          href="/app"
          className="inline-block bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-700 transition"
        >
          Ir para o painel
        </Link>
      </div>
    </div>
  )
}
