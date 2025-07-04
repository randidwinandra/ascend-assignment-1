import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Flash Survey Tool - StoryStream Studios',
  description: 'Internal Flash Survey tool for gathering quick feedback and insights',
  keywords: ['survey', 'feedback', 'analytics', 'StoryStream Studios'],
  authors: [{ name: 'StoryStream Studios' }],
  creator: 'StoryStream Studios',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://flashsurvey.storystreamstudios.com',
    title: 'Flash Survey Tool - StoryStream Studios',
    description: 'Internal Flash Survey tool for gathering quick feedback and insights',
    siteName: 'Flash Survey Tool',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flash Survey Tool - StoryStream Studios',
    description: 'Internal Flash Survey tool for gathering quick feedback and insights',
    creator: '@storystreamstudios',
  },
  robots: {
    index: false, // Internal tool - don't index
    follow: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <div className="min-h-full">
          {children}
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
} 