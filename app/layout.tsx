import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import AuthGate from '../components/auth-gate'

export const metadata: Metadata = {
  title: 'dekord-sims',
  description: 'dekord stock and inventory management system',
  generator: 'dekord-sims',
  icons: {
    icon: '/favicon-white.ico',
    shortcut: '/favicon-white.ico',
    apple: '/favicon-white.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthGate>
          {children}
        </AuthGate>
        <Analytics />
      </body>
    </html>
  )
}
