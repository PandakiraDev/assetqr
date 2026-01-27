import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/ThemeProvider'
import { SWRProvider } from '@/components/SWRProvider'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'AssetQR - System zarządzania inwentarzem',
  description: 'Profesjonalny system zarządzania inwentarzem firmowym oparty na QR kodach',
  keywords: ['inwentarz', 'QR', 'zarządzanie', 'aktywa', 'przedmioty'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = localStorage.getItem('theme');
                const theme = stored === 'dark' ? 'dark' :
                             stored === 'light' ? 'light' :
                             window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.classList.add(theme);
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <SWRProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  )
}
