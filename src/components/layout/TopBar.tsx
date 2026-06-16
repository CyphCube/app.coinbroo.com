'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useAccount_HL } from '@/hooks/useAccountHL'
import { TransferModal } from '@/components/ui/TransferModal'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Coinbroo'

function fmt(n: number, decimals = 2) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(decimals)
}

function fmtPrice(p: number) {
  if (p === 0) return '—'
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (p >= 1) return p.toFixed(4)
  return p.toFixed(6)
}

interface TopBarProps {
  selectedMarket: string
  markPrice: number
  change24h: number
  prevDayPx: number
  funding: number
  volume24h: number
  openInterest: number
}

export function TopBar({ selectedMarket, markPrice, change24h, prevDayPx, funding, volume24h, openInterest }: TopBarProps) {
  const { isConnected } = useAccount()
  const { accountValue, availableBalance, totalPnl } = useAccount_HL()
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTab, setTransferTab] = useState<'deposit' | 'withdraw'>('deposit')

  const isUp = change24h >= 0
  const fundingPositive = funding >= 0

  const stats = [
    { label: '24h Change', value: `${isUp ? '+' : ''}${change24h.toFixed(2)}%`, color: isUp ? 'text-long' : 'text-short' },
    { label: '24h High', value: `$${fmtPrice(markPrice * 1.005)}`, color: 'text-text-primary' },
    { label: '24h Low', value: `$${fmtPrice(prevDayPx > 0 ? prevDayPx * 0.995 : 0)}`, color: 'text-text-primary' },
    { label: '24h Volume', value: `$${fmt(volume24h)}`, color: 'text-text-primary' },
    { label: 'Open Interest', value: `$${fmt(openInterest * markPrice)}`, color: 'text-text-primary' },
    { label: 'Funding (1h)', value: `${fundingPositive ? '+' : ''}${(funding * 100).toFixed(4)}%`, color: fundingPositive ? 'text-long' : 'text-short' },
  ]

  return (
    <>
      <header className="h-11 flex items-center gap-0 px-3 bg-bg-secondary border-b border-border-primary flex-shrink-0 overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4 flex-shrink-0">
          <div className="w-6 h-6 rounded-md bg-accent-blue flex items-center justify-center">
            <span className="text-white text-xs font-bold">{APP_NAME[0]}</span>
          </div>
          <span className="text-text-primary font-semibold text-sm hidden sm:block">{APP_NAME}</span>
        </div>

        {/* Market + price */}
        <div className="flex items-center gap-2.5 mr-4 flex-shrink-0 border-r border-border-primary pr-4">
          <span className="text-text-primary font-semibold text-sm">{selectedMarket}-PERP</span>
          <span className={`font-mono text-sm font-semibold ${isUp ? 'text-long' : 'text-short'}`}>
            ${fmtPrice(markPrice)}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-5 flex-1 overflow-hidden">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col flex-shrink-0">
              <span className="text-2xs text-text-muted leading-none mb-0.5">{s.label}</span>
              <span className={`text-xs font-mono font-medium leading-none ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Account info */}
        {isConnected && accountValue > 0 && (
          <div className="hidden lg:flex items-center gap-4 mx-4 px-4 border-x border-border-primary flex-shrink-0">
            <div className="flex flex-col">
              <span className="text-2xs text-text-muted leading-none mb-0.5">Balance</span>
              <span className="text-xs font-mono font-medium text-text-primary leading-none">${accountValue.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xs text-text-muted leading-none mb-0.5">Unrealized PnL</span>
              <span className={`text-xs font-mono font-medium leading-none ${totalPnl >= 0 ? 'text-long' : 'text-short'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Deposit / Withdraw */}
        {isConnected && (
          <div className="flex items-center gap-1.5 mr-2 flex-shrink-0">
            <button
              onClick={() => { setTransferTab('deposit'); setTransferOpen(true) }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-long hover:bg-long-dim text-white transition-colors"
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
        <div className="flex-shrink-0">
          <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
        </div>
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
