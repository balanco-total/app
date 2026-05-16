'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const POLL_INTERVAL = 5 * 60 * 1000 // 5 minutos

export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const buildIdRef = useRef<string | null>(null)

  useEffect(() => {
    async function fetchBuildId() {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const { buildId } = await res.json()
        return buildId as string
      } catch {
        return null
      }
    }

    async function init() {
      const id = await fetchBuildId()
      if (id) buildIdRef.current = id
    }

    async function check() {
      const id = await fetchBuildId()
      if (id && buildIdRef.current && id !== buildIdRef.current) {
        setUpdateAvailable(true)
      }
    }

    init()
    const timer = setInterval(check, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  if (!updateAvailable) return null

  return (
    <div className="flex items-center justify-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 px-4 py-3 mb-4 text-center">
      <RefreshCw size={18} className="shrink-0 text-blue-500" />
      <span className="text-sm font-medium">
        Nova versão disponível. Atualize a página para carregar.{' '}
        <a href="" className="font-semibold underline hover:text-blue-900 transition-colors">
          Clique para Atualizar.
        </a>
      </span>
    </div>
  )
}
