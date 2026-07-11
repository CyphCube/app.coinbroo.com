'use client'

import { useMemo } from 'react'
import { useMarkets } from '@/hooks/useMarkets'
import { TokenLogo } from '@/components/ui/TokenLogo'
import { useTranslation } from '@/hooks/useTranslation'
import { useSettings } from '@/hooks/useSettings'
import { applyNumberFormat } from '@/lib/numberFormat'

interface BalancesProps {
  spotBalances: Record<string, number>
}

function fmtBalance(n: number) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toFixed(6)
}

export function Balances({ spotBalances }: BalancesProps) {
  const markets = useMarkets()
  const { t } = useTranslation()
  const { settings } = useSettings()
  const fmt = (s: string) => applyNumberFormat(s, settings.numberFormat)

  // Price spot balances via the same market data the Trade page uses, keyed
  // by the raw token symbol (e.g. "UBTC") — matches how spotBalances is keyed.
  const priceByToken = useMemo(() => {
    const map: Record<string, number> = { USDC: 1 }
    markets.forEach(m => {
      if (m.kind === 'spot' && m.baseToken) map[m.baseToken] = m.price
    })
    return map
  }, [markets])

  const rows = Object.entries(spotBalances)
    .filter(([, bal]) => bal > 0)
    .map(([coin, bal]) => ({ coin, bal, value: bal * (priceByToken[coin] ?? 0) }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-border-primary">
        <span className="text-sm font-semibold text-text-primary">{t('portfolio.balances')}</span>
      </div>
      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-xs text-text-muted">{t('portfolio.noBalances')}</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-2xs text-text-muted uppercase tracking-wider border-b border-border-primary">
              <th className="px-3 py-1.5 text-left font-medium">{t('portfolio.asset')}</th>
              <th className="px-3 py-1.5 text-right font-medium">{t('positions.balance')}</th>
              <th className="px-3 py-1.5 text-right font-medium">{t('portfolio.value')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.coin} className="border-b border-border-primary/50 last:border-0 hover:bg-bg-hover text-xs">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <TokenLogo symbol={r.coin} size={18} />
                    <span className="font-medium text-text-primary">{r.coin}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-text-secondary text-right tabular-nums">{fmt(fmtBalance(r.bal))}</td>
                <td className="px-3 py-2 font-mono text-text-primary text-right tabular-nums">${fmt(r.value.toFixed(2))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
