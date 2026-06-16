'use client'

import { useMemo, useState } from 'react'
import type { OrderBookLevel, Trade } from '@/hooks/useHLWebSocket'

interface OrderBookProps {
  coin: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  markPrice: number
  spread: number
  trades: Trade[]
  szDecimals: number
}

function fmtPrice(px: number) {
  if (px >= 1000) return px.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (px >= 1) return px.toFixed(4)
  return px.toFixed(6)
}

function fmtSize(sz: number) {
  if (sz >= 1e6) return (sz / 1e6).toFixed(2) + 'M'
  if (sz >= 1e3) return sz.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (sz >= 1) return sz.toFixed(2)
  return sz.toFixed(4)
}

function OBRow({ px, sz, total, side, maxCum, cum }: {
  px: number
  sz: number
  total: number
  side: 'bid' | 'ask'
  maxCum: number
  cum: number
}) {
  const pct = maxCum > 0 ? (cum / maxCum) * 100 : 0
  const isBid = side === 'bid'
  return (
    <div className="relative grid grid-cols-3 items-center px-2 flex-1 min-h-0 hover:bg-bg-hover cursor-default text-2xs">
      <div
        className={`absolute top-0 bottom-0 left-0 opacity-[0.13] ${isBid ? 'bg-long' : 'bg-short'}`}
        style={{ width: `${pct}%` }}
      />
      <span className={`font-mono z-10 tabular-nums ${isBid ? 'text-long' : 'text-short'}`}>{fmtPrice(px)}</span>
      <span className="font-mono z-10 text-text-secondary tabular-nums text-right">{fmtSize(sz)}</span>
      <span className="font-mono z-10 text-text-muted tabular-nums text-right">{fmtSize(total)}</span>
    </div>
  )
}

export function OrderBook({ coin, bids, asks, markPrice, spread, trades, szDecimals }: OrderBookProps) {
  const [tab, setTab] = useState<'book' | 'trades'>('book')
  const N = 11

  const { askRows, bidRows, maxCum } = useMemo(() => {
    const mkRows = (levels: OrderBookLevel[]) => {
      let cum = 0
      return levels.slice(0, N).map(l => {
        const px = parseFloat(l.px)
        const sz = parseFloat(l.sz)
        cum += sz
        return { px, sz, cum }
      })
    }
    const askRowsRaw = mkRows(asks)
    const bidRowsRaw = mkRows(bids)
    const maxCum = Math.max(
      askRowsRaw[askRowsRaw.length - 1]?.cum || 0,
      bidRowsRaw[bidRowsRaw.length - 1]?.cum || 0,
    )
    return { askRows: [...askRowsRaw].reverse(), bidRows: bidRowsRaw, maxCum }
  }, [bids, asks])

  const spreadPct = markPrice > 0 ? ((spread / markPrice) * 100).toFixed(3) : '0.000'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center border-b border-border-primary flex-shrink-0">
        <button
          onClick={() => setTab('book')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            tab === 'book' ? 'text-text-primary border-b-2 border-accent-blue -mb-px' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Order Book
        </button>
        <button
          onClick={() => setTab('trades')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            tab === 'trades' ? 'text-text-primary border-b-2 border-accent-blue -mb-px' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Trades
        </button>
      </div>

      {tab === 'book' ? (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-3 px-2 py-1 border-b border-border-primary flex-shrink-0">
            <span className="text-2xs text-text-muted">Price</span>
            <span className="text-2xs text-text-muted text-right">Size ({coin})</span>
            <span className="text-2xs text-text-muted text-right">Total</span>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Asks */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {askRows.map((r, i) => (
                <OBRow key={`ask-${i}`} px={r.px} sz={r.sz} total={r.cum} cum={r.cum} side="ask" maxCum={maxCum} />
              ))}
            </div>

            {/* Spread row */}
            <div className="grid grid-cols-3 px-2 py-1 border-y border-border-primary bg-bg-tertiary flex-shrink-0 text-2xs">
              <span className="text-text-secondary font-medium">Spread</span>
              <span className="font-mono text-text-secondary text-right tabular-nums">{spread > 0 ? fmtPrice(spread) : '—'}</span>
              <span className="font-mono text-text-muted text-right tabular-nums">{spreadPct}%</span>
            </div>

            {/* Bids */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {bidRows.map((r, i) => (
                <OBRow key={`bid-${i}`} px={r.px} sz={r.sz} total={r.cum} cum={r.cum} side="bid" maxCum={maxCum} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Trades feed */
        <div className="flex flex-col h-full overflow-hidden">
          <div className="grid grid-cols-3 px-2 py-1 border-b border-border-primary flex-shrink-0">
            <span className="text-2xs text-text-muted">Price</span>
            <span className="text-2xs text-text-muted text-right">Size ({coin})</span>
            <span className="text-2xs text-text-muted text-right">Time</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {trades.length === 0 ? (
              <div className="flex items-center justify-center h-full text-2xs text-text-muted">No recent trades</div>
            ) : (
              trades.map((t, i) => {
                const isBuy = t.side === 'B'
                return (
                  <div key={`${t.tid}-${i}`} className="grid grid-cols-3 px-2 py-[2.5px] text-2xs hover:bg-bg-hover">
                    <span className={`font-mono tabular-nums ${isBuy ? 'text-long' : 'text-short'}`}>{fmtPrice(parseFloat(t.px))}</span>
                    <span className="font-mono text-text-secondary tabular-nums text-right">{fmtSize(parseFloat(t.sz))}</span>
                    <span className="font-mono text-text-muted tabular-nums text-right">{new Date(t.time).toLocaleTimeString('en-US', { hour12: false })}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
