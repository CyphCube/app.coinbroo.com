'use client'

import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { arbitrum, mainnet } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

const config = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Coinbroo',
  projectId: '13c92157e4e6cc44f371323be5db3e00', // Replace with your WalletConnect project ID from cloud.walletconnect.com
  chains: [arbitrum, mainnet],
  ssr: false,
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#1EBCAD',
            accentColorForeground: '#0a0e0f',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
