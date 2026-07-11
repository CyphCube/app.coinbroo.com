'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useAccount_HL } from '@/hooks/useAccountHL'
import { TransferModal } from '@/components/ui/TransferModal'
import { NumberFormatMenu } from '@/components/layout/NumberFormatMenu'
import { SettingsMenu } from '@/components/layout/SettingsMenu'
import { useTranslation } from '@/hooks/useTranslation'
import type { TranslationKey } from '@/lib/translations'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Coinbroo'

const NAV_ITEMS: TranslationKey[] = ['nav.trade', 'nav.portfolio', 'nav.vaults', 'nav.referrals', 'nav.leaderboard']

export function NavBar() {
  const { isConnected } = useAccount()
  const { availableBalance } = useAccount_HL()
  const { t } = useTranslation()
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTab, setTransferTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="h-12 flex items-center gap-1 px-3 md:px-4 bg-bg-secondary border-b border-border-primary flex-shrink-0">
        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
          className="md:hidden flex items-center justify-center w-8 h-8 -ml-1 mr-1 rounded-md text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 mr-3 md:mr-6 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={`${APP_NAME} logo`} className="w-7 h-7 object-contain" />
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
              {t(item)}
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
              {t('nav.deposit')}
            </button>
            <button
              onClick={() => { setTransferTab('withdraw'); setTransferOpen(true) }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-primary text-text-secondary hover:bg-bg-hover transition-colors"
            >
              {t('nav.withdraw')}
            </button>
          </div>
        )}

        {/* Wallet — custom-styled to match the app's compact theme */}
        <div className="flex items-center gap-2">
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
              const ready = mounted && authenticationStatus !== 'loading'
              const connected = ready && account && chain && (authenticationStatus === 'authenticated' || !authenticationStatus)

              if (!ready) {
                return <div className="w-[110px] h-[30px]" aria-hidden />
              }

              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent-blue hover:bg-accent-blue-dim text-bg-primary transition-colors whitespace-nowrap"
                  >
                    {t('nav.connect')}
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-short/40 text-short hover:bg-short/10 transition-colors whitespace-nowrap"
                  >
                    {t('nav.wrongNetwork')}
                  </button>
                )
              }

              return (
                <button
                  onClick={openAccountModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-bg-tertiary text-text-primary hover:bg-bg-hover transition-colors"
                >
                  {account.ensAvatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={account.ensAvatar} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-accent-blue flex-shrink-0" />
                  )}
                  <span className="font-mono">{account.displayName}</span>
                </button>
              )
            }}
          </ConnectButton.Custom>
          <NumberFormatMenu />
          <SettingsMenu />
        </div>
      </header>

      {/* Mobile nav menu */}
      {menuOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <nav className="md:hidden fixed left-0 right-0 top-12 z-50 bg-bg-secondary border-b border-border-primary flex flex-col py-1 shadow-2xl">
            {NAV_ITEMS.map((item, i) => (
              <button
                key={item}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 text-md text-left font-medium transition-colors ${
                  i === 0 ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {t(item)}
              </button>
            ))}
          </nav>
        </>
      )}

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
