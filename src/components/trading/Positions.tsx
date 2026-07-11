'use client'

import { useAccount_HL } from '@/hooks/useAccountHL'
import { useWalletClient } from 'wagmi'
import { postExchange } from '@/lib/hyperliquid'
import { signOrder } from '@/lib/signing'
import { useState } from 'react'
import type { Position } from '@/lib/hyperliquid'
import { useSettings } from '@/hooks/useSettings'
import { applyNumberFormat } from '@/lib/numberFormat'
import { useTranslation } from '@/hooks/useTranslation'

interface PositionsProps {
  markPrices: Record<string, number>
  assetIndexMap: Record<string, number>
}

function fmtPrice(p: number) {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (p >= 1) return p.toFixed(4)
  return p.toFixed(6)
}

function PositionRow({ pos, markPrice, assetIndex, walletClient, onClose, fmt, hidePnl }: {
  pos: Position
  markPrice: number
  assetIndex: number
  walletClient: unknown
  onClose: () => void
  fmt: (s: string) => string
  hidePnl: boolean
}) {
  const size = parseFloat(pos.szi)
  const entry = parseFloat(pos.entryPx)
  const pnl = parseFloat(pos.unrealizedPnl)
  const roe = parseFloat(pos.returnOnEquity) * 100
  const liq = pos.liquidationPx ? parseFloat(pos.liquidationPx) : null
  const isLong = size > 0
  const [closing, setClosing] = useState(false)
  const { t } = useTranslation()

  async function closePosition() {
    if (!walletClient) return
    setClosing(true)
    try {
      const { action, nonce, signature } = await signOrder(walletClient as Parameters<typeof signOrder>[0], {
        coin: pos.coin, isBuy: !isLong, sz: Math.abs(size), reduceOnly: true,
      })
      const actionWithAsset = {
        ...action,
        orders: [{ ...(action as { orders: { a: number }[] }).orders[0], a: assetIndex }],
      }
      await postExchange(actionWithAsset, nonce, signature)
      setTimeout(onClose, 1000)
    } catch (e) {
      console.error('Close failed', e)
    } finally {
      setClosing(false)
    }
  }

  return (
    <tr className="border-b border-border-primary/50 hover:bg-bg-hover text-xs group">
      <td className="px-3 py-2 font-medium text-text-primary whitespace-nowrap">{pos.coin}-PERP</td>
      <td className="px-3 py-2">
        <span className={`px-1.5 py-0.5 rounded text-2xs font-semibold ${isLong ? 'bg-long/15 text-long' : 'bg-short/15 text-short'}`}>
          {isLong ? t('positions.long') : t('positions.short')}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-text-secondary tabular-nums">{fmt(Math.abs(size).toFixed(4))}</td>
      <td className="px-3 py-2 font-mono text-text-secondary tabular-nums">${fmt(fmtPrice(entry))}</td>
      <td className="px-3 py-2 font-mono text-text-primary tabular-nums">${fmt(fmtPrice(markPrice))}</td>
      <td className="px-3 py-2 font-mono text-short tabular-nums">
        {liq ? `$${fmt(fmtPrice(liq))}` : '—'}
      </td>
      <td className={`px-3 py-2 font-mono font-medium tabular-nums ${pnl >= 0 ? 'text-long' : 'text-short'}`}>
        {hidePnl ? '••••' : (
          <>
            {pnl >= 0 ? '+' : ''}${fmt(pnl.toFixed(2))}
            <span className="text-2xs ml-1 opacity-60">({roe >= 0 ? '+' : ''}{roe.toFixed(1)}%)</span>
          </>
        )}
      </td>
      <td className="px-3 py-2">
        <button
          onClick={closePosition}
          disabled={closing}
          className="text-2xs px-2 py-1 rounded border border-short/40 text-short hover:bg-short/10 transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100"
        >
          {closing ? '...' : t('positions.close')}
        </button>
      </td>
    </tr>
  )
}

export function Positions({ markPrices, assetIndexMap }: PositionsProps) {
  const { positions, openOrders, fills, totalPnl, accountValue, availableBalance, refresh } = useAccount_HL()
  const { data: walletClient } = useWalletClient()
  const [tab, setTab] = useState<'positions' | 'orders' | 'history'>('positions')
  const { settings } = useSettings()
  const fmt = (s: string) => applyNumberFormat(s, settings.numberFormat)
  const { t } = useTranslation()

  const tabs = [
    { key: 'positions' as const, label: `${t('positions.positions')} (${positions.length})` },
    { key: 'orders' as const, label: `${t('positions.orders')} (${(openOrders as unknown[]).length})` },
    { key: 'history' as const, label: t('positions.history') },
  ]

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border-primary flex-shrink-0 px-1">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              tab === tb.key
                ? 'text-text-primary border-b-2 border-accent-blue -mb-px'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tb.label}
          </button>
        ))}

        {/* Account summary on right */}
        <div className="ml-auto pr-2 flex items-center gap-5 text-xs">
          {accountValue > 0 && (
            <>
              <span className="text-text-muted">
                {t('positions.balance')}: <span className="text-text-primary font-mono">${fmt(accountValue.toFixed(2))}</span>
              </span>
              <span className="text-text-muted">
                {t('positions.available')}: <span className="text-text-primary font-mono">${fmt(availableBalance.toFixed(2))}</span>
              </span>
              {positions.length > 0 && (
                <span className="text-text-muted">
                  {t('positions.pnl')}:{' '}
                  <span className={`font-mono font-medium ${totalPnl >= 0 ? 'text-long' : 'text-short'}`}>
                    {settings.hidePnl ? '••••' : `${totalPnl >= 0 ? '+' : ''}$${fmt(totalPnl.toFixed(2))}`}
                  </span>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="h-72 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto">
        {tab === 'positions' && (
          positions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-text-muted">
              {t('positions.noOpenPositions')}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-2xs text-text-muted uppercase tracking-wider border-b border-border-primary sticky top-0 bg-bg-secondary">
                  {[t('positions.market'), t('positions.side'), t('positions.size'), t('positions.entry'), t('positions.mark'), t('positions.liqPrice'), t('positions.pnlRoe'), ''].map(h => (
                    <th key={h} className="px-3 py-1.5 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => (
                  <PositionRow
                    key={pos.coin}
                    pos={pos}
                    markPrice={markPrices[pos.coin] || 0}
                    assetIndex={assetIndexMap[pos.coin] ?? -1}
                    walletClient={walletClient}
                    onClose={refresh}
                    fmt={fmt}
                    hidePnl={settings.hidePnl}
                  />
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'orders' && (
          (openOrders as unknown[]).length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-text-muted">
              {t('positions.noOpenOrders')}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-2xs text-text-muted uppercase tracking-wider border-b border-border-primary sticky top-0 bg-bg-secondary">
                  {[t('positions.market'), t('positions.side'), t('positions.size'), t('positions.price')].map(h => (
                    <th key={h} className="px-3 py-1.5 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(openOrders as { coin: string; side: string; sz: string; limitPx: string; oid: number }[]).map((o, i) => (
                  <tr key={i} className="border-b border-border-primary/50 text-xs hover:bg-bg-hover">
                    <td className="px-3 py-2 font-medium text-text-primary">{o.coin}-PERP</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-2xs font-semibold ${o.side === 'B' ? 'bg-long/15 text-long' : 'bg-short/15 text-short'}`}>
                        {o.side === 'B' ? t('tradePanel.buy') : t('tradePanel.sell')}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-text-secondary">{fmt(o.sz)}</td>
                    <td className="px-3 py-2 font-mono text-text-secondary">${fmt(o.limitPx)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'history' && (
          (fills as unknown[]).length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-text-muted">
              {t('positions.noTradeHistory')}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-2xs text-text-muted uppercase tracking-wider border-b border-border-primary sticky top-0 bg-bg-secondary">
                  {[t('positions.time'), t('positions.market'), t('positions.side'), t('positions.size'), t('positions.price'), t('positions.fee')].map(h => (
                    <th key={h} className="px-3 py-1.5 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(fills as { time: number; coin: string; side: string; sz: string; px: string; fee: string }[]).slice(0, 50).map((f, i) => (
                  <tr key={i} className="border-b border-border-primary/50 hover:bg-bg-hover text-xs">
                    <td className="px-3 py-1.5 text-text-muted tabular-nums">{new Date(f.time).toLocaleDateString()} {new Date(f.time).toLocaleTimeString()}</td>
                    <td className="px-3 py-1.5 text-text-primary font-medium">{f.coin}-PERP</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-2xs font-semibold ${f.side === 'B' ? 'bg-long/15 text-long' : 'bg-short/15 text-short'}`}>
                        {f.side === 'B' ? t('tradePanel.buy') : t('tradePanel.sell')}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-text-secondary tabular-nums">{fmt(f.sz)}</td>
                    <td className="px-3 py-1.5 font-mono text-text-secondary tabular-nums">${fmt(f.px)}</td>
                    <td className="px-3 py-1.5 font-mono text-text-muted tabular-nums">${fmt(parseFloat(f.fee).toFixed(4))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
      </div>
    </div>
  )
}
