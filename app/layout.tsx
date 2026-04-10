import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Linker - AI Knowledge Graph Learning Platform',
  description: 'Discover the root cause of every learning mistake with AI-powered knowledge graphs. Trace gaps to their source, not just surface symptoms.',
  keywords: ['learning', 'AI', 'education', 'knowledge graph', 'personalized learning'],
  authors: [{ name: 'Linker Team' }],
  openGraph: {
    title: 'Linker - Find the Root Cause of Every Wrong Answer',
    description: 'AI-powered platform to identify and fix learning gaps at their source.',
    type: 'website',
  },
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f9f9' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1c1c' },
  ],
}

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode
}>) {
  return (
      <html lang="en">
      <body className="font-sans antialiased">
      {children}
      {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
      </html>
  )
}
