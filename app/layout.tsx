import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'
import '@mysten/dapp-kit/dist/index.css'
import { WalletConnectButton } from '@/components/WalletConnect'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Water Quality Dashboard',
  description: 'Monitor and analyze water quality readings from Sui blockchain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem', borderBottom: '1px solid #eee'
          }}>
            <div style={{ fontWeight: 700 }}>Water Quality Dashboard</div>
            <WalletConnectButton />
          </header>
          {children}
        </Providers>
      </body>
    </html>
  )
}
