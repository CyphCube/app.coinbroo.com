'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useAccount_HL } from '@/hooks/useAccountHL'
import { TransferModal } from '@/components/ui/TransferModal'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Coinbroo'

const NAV_ITEMS = ['Trade', 'Portfolio', 'Vaults', 'Referrals', 'Leaderboard']

export function NavBar() {
  const { isConnected } = useAccount()
  const { availableBalance } = useAccount_HL()
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTab, setTransferTab] = useState<'deposit' | 'withdraw'>('deposit')

  return (
    <>
      <header className="h-12 flex items-center gap-1 px-4 bg-bg-secondary border-b border-border-primary flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-6 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-accent-blue flex items-center justify-center">
            <span className="text-bg-primary text-sm font-black tracking-tighter">cb</span>
          </div>
          <span className="text-text-primary font-bold text-base tracking-tight whitespace-nowrap">{APP_NAME}</span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                i === 0 ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Deposit / Withdraw */}
        {isConnected && (
          <div className="flex items-center gap-1.5 mr-2">
            <button
              onClick={() => { setTransferTab('deposit'); setTransferOpen(true) }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-long hover:bg-long-dim text-bg-primary transition-colors"
            >
              Deposit
            </button>
            <button
              onClick={() => { setTransferTab('withdraw'); setTransferOpen(true) }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-primary text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Withdraw
            </button>
          </div>
        )}

        {/* Wallet */}
        <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
      </header>

      {transferOpen && (
        <TransferModal
          initialTab={transferTab}
          availableBalance={availableBalance}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </>
  )
}
