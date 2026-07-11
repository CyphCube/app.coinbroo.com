'use client'

import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { NavBar } from '@/components/layout/NavBar'
import { Positions } from '@/components/trading/Positions'
import { EquityChart } from '@/components/portfolio/EquityChart'
import { Balances } from '@/components/portfolio/Balances'
import { TransferModal } from '@/components/ui/TransferModal'
import { useAccount_HL } from '@/hooks/useAccountHL'
import { useMarkets } from '@/hooks/useMarkets'
import { useSettings } from '@/hooks/useSettings'
import { applyNumberFormat } from '@/lib/numberFormat'
import { useTranslation } from '@/hooks/useTranslation'

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const { accountValue, availableBalance, totalPnl, spotBalances } = useAccount_HL()
  const markets = useMarkets()
  const { settings } = useSettings()
  const fmt = (s: string) => applyNumberFormat(s, settings.numberFormat)
  const { t } = useTranslation()
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTab, setTransferTab] = useState<'deposit' | 'withdraw'>('deposit')

  // Same mapping the Trade page uses: perp mark prices + asset indices, so
  // the shared <Positions> table shows correct Mark prices and Close works.
  const markPrices = useMemo(() => {
    const m: Record<string, number> = {}
    markets.forEach(mk => { if (mk.kind === 'perp') m[mk.coin] = mk.price })
    return m
  }, [markets])
  const assetIndexMap = useMemo(() => {
    const m: Record<string, number> = {}
    markets.forEach(mk => { if (mk.kind === 'perp') m[mk.coin] = mk.assetIndex })
    return m
  }, [markets])

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary">
      <NavBar />

      <div className="max-w-5xl w-full mx-auto px-4 py-6 flex flex-col gap-4">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
            <span className="text-text-primary font-semibold">{t('portfolio.connectPrompt')}</span>
            <span className="text-text-muted text-sm">{t('portfolio.connectPromptSub')}</span>
          </div>
        ) : (
          <>
            {/* Header stats + deposit/withdraw */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-8">
                <div className="flex flex-col">
                  <span className="text-2xs text-text-muted mb-1">{t('topBar.accountEquity')}</span>
                  <span className="text-2xl font-mono font-bold text-text-primary">${fmt(accountValue.toFixed(2))}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xs text-text-muted mb-1">{t('portfolio.availableBalance')}</span>
                  <span className="text-lg font-mono font-medium text-text-secondary">${fmt(availableBalance.toFixed(2))}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xs text-text-muted mb-1">{t('topBar.unrealizedPnl')}</span>
                  <span className={`text-lg font-mono font-medium ${totalPnl >= 0 ? 'text-long' : 'text-short'}`}>
                    {settings.hidePnl ? '••••' : `${totalPnl >= 0 ? '+' : ''}$${fmt(totalPnl.toFixed(2))}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setTransferTab('deposit'); setTransferOpen(true) }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-long hover:bg-long-dim text-bg-primary transition-colors"
                >
                  {t('nav.deposit')}
                </button>
                <button
                  onClick={() => { setTransferTab('withdraw'); setTransferOpen(true) }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border-primary text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  {t('nav.withdraw')}
                </button>
              </div>
            </div>

            {/* Equity chart */}
            {address && <EquityChart address={address} />}

            {/* Spot balances */}
            <Balances spotBalances={spotBalances} />

            {/* Positions / Orders / History (shared with the Trade page) */}
            <div className="bg-bg-secondary border border-border-primary rounded-lg overflow-hidden">
              <Positions markPrices={markPrices} assetIndexMap={assetIndexMap} />
            </div>
          </>
        )}
      </div>

      {transferOpen && (
        <TransferModal
          initialTab={transferTab}
          availableBalance={availableBalance}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </div>
  )
}
