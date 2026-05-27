'use client'

import dynamic from 'next/dynamic'

// Keeps the PWA install prompt out of the initial render path on every route.
const InstallPrompt = dynamic(() => import('./InstallPrompt'), { ssr: false })

export default function InstallPromptLoader() {
  return <InstallPrompt />
}
