import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // VERCEL_GIT_COMMIT_SHA é injetado automaticamente em todo deploy da Vercel.
  // Localmente retorna 'dev' (fixo), então o banner nunca aparece em dev.
  const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev'
  return NextResponse.json({ buildId })
}
