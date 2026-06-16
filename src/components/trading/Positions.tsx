'use client'

import { useAccount_HL } from '@/hooks/useAccountHL'
import { useWalletClient } from 'wagmi'
import { postExchange } from '@/lib/hyperliquid'
import { signOrder } from '@/lib/signing'
import { useState } from 'react'
import type { Position } from '@/lib/hyperliquid'

interface PositionsProps {
  markPrices: Record<string, number>
  meta: { universe: Array<{ name: string; szDecimals: number; maxLeverage: number }> }
}

function fmtPrice(p: number) {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (p >= 1) return p.toFixed(4)
  return p.toFixed(6)
}

function PositionRow({ pos, markPrice, assetIndex, walletClient, onClose }: {
  pos: Position
  markPrice: number
  assetIndex: number
  walletClient: unknown
  onClose: () => void
}) {
  const size = parseFloat(pos.szi)
  const entry = parseFloat(pos.entryPx)
  const pnl = parseFloat(pos.unrealizedPnl)
  const roe = parseFloat(pos.returnOnEquity) * 100
  const liq = pos.liquidationPx ? parseFloat(pos.liquidationPx) : null
  const isLong = size > 0
  const [closing, setClosing] = useState(false)

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
          {isLong ? 'Long' : 'Short'}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-text-secondary tabular-nums">{Math.abs(size).toFixed(4)}</td>
      <td className="px-3 py-2 font-mono text-text-secondary tabular-nums">${fmtPrice(entry)}</td>
      <td className="px-3 py-2 font-mono text-text-primary tabular-nums">${fmtPrice(markPrice)}</td>
      <td className="px-3 py-2 font-mono text-short tabular-nums">
        {liq ? `$${fmtPrice(liq)}` : '—'}
      </td>
      <td className={`px-3 py-2 font-mono font-medium tabular-nums ${pnl >= 0 ? 'text-long' : 'text-short'}`}>
        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
        <span className="text-2xs ml-1 opacity-60">({roe >= 0 ? '+' : ''}{roe.toFixed(1)}%)</span>
      </td>
      <td className="px-3 py-2">
        <button
          onClick={closePosition}
          disabled={closing}
          className="text-2xs px-2 py-1 rounded border border-short/40 text-short hover:bg-short/10 transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100"
        >
          {closing ? '...' : 'Close'}
        </button>
      </td>
    </tr>
  )
}

export function Positions({ markPrices, meta }: PositionsProps) {
  const { positions, openOrders, fills, totalPnl, accountValue, availableBalance, refresh } = useAccount_HL()
  const { data: walletClient } = useWalletClient()
  const [tab, setTab] = useState<'positions' | 'orders' | 'history'>('positions')

  const tabs = [
    { key: 'positions' as const, label: `Positions (${positions.length})` },
    { key: 'orders' as const, label: `Orders (${(openOrders as unknown[]).length})` },
    { key: 'history' as const, label: 'History' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border-primary flex-shrink-0 px-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'text-text-primary border-b-2 border-accent-blue -mb-px'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}

        {/* Account summary on right */}
        <div className="ml-auto pr-3 flex items-center gap-5 text-xs">
          {accountValue > 0 && (
            <>
              <span className="text-text-muted">
                Balance: <span className="text-text-primary font-mono">${accountValue.toFixed(2)}</span>
              </span>
              <span className="text-text-muted">
                Available: <span className="text-text-primary font-mono">${availableBalance.toFixed(2)}</span>
              </span>
              {positions.length > 0 && (
                <span className="text-text-muted">
                  PnL:{' '}
                  <span className={`font-mono font-medium ${totalPnl >= 0 ? 'text-long' : 'text-short'}`}>
                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                  </span>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'positions' && (
          positions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-text-muted">
              No open positions
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-2xs text-text-muted uppercase tracking-wider border-b border-border-primary sticky top-0 bg-bg-secondary">
                  {['Market', 'Side', 'Size', 'Entry', 'Mark', 'Liq. Price', 'PnL (ROE)', ''].map(h => (
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
                    assetIndex={meta.universe.findIndex(u => u.name === pos.coin)}
                    walletClient={walletClient}
                    onClose={refresh}
                  />
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'orders' && (
          (openOrders as unknown[]).length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-text-muted">
              No open orders
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-2xs text-text-muted uppercase tracking-wider border-b border-border-primary sticky top-0 bg-bg-secondary">
                  {['Market', 'Side', 'Size', 'Price'].map(h => (
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
                        {o.side === 'B' ? 'Buy' : 'Sell'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-text-secondary">{o.sz}</td>
                    <td className="px-3 py-2 font-mono text-text-secondary">${o.limitPx}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'history' && (
          (fills as unknown[]).length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-text-muted">
              No trade history
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-2xs text-text-muted uppercase tracking-wider border-b border-border-primary sticky top-0 bg-bg-secondary">
                  {['Time', 'Market', 'Side', 'Size', 'Price', 'Fee'].map(h => (
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
                        {f.side === 'B' ? 'Buy' : 'Sell'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-text-secondary tabular-nums">{f.sz}</td>
                    <td className="px-3 py-1.5 font-mono text-text-secondary tabular-nums">${f.px}</td>
                    <td className="px-3 py-1.5 font-mono text-text-muted tabular-nums">${parseFloat(f.fee).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}
