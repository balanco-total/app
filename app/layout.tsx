import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BalançoTotal',
  description: 'Controle de despesas compartilhado',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
