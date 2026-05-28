import type { Metadata } from 'next'
import './globals.css'
import InstallPromptLoader from '@/components/InstallPromptLoader'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark');}catch(e){}})()`

export const metadata: Metadata = {
  title: 'BalançoTotal',
  description: 'Controle de despesas compartilhado',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="theme-color" content="#1B4332" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0b0f14" media="(prefers-color-scheme: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BalançoTotal" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="bg-white dark:bg-dm-surface">
        <ThemeProvider>
          {children}
          <InstallPromptLoader />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
