'use client'

import { useMemo } from 'react'
import type { OrderBookLevel } from '@/hooks/useHLWebSocket'

interface OrderBookProps {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  markPrice: number
  spread: number
}

function fmtPrice(px: number) {
  if (px >= 1000) return px.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (px >= 1) return px.toFixed(4)
  return px.toFixed(6)
}

function fmtSize(sz: number) {
  if (sz >= 1000) return sz.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (sz >= 1) return sz.toFixed(2)
  return sz.toFixed(4)
}

function OBRow({ level, side, maxCumSize, cumSize }: {
  level: OrderBookLevel
  side: 'bid' | 'ask'
  maxCumSize: number
  cumSize: number
}) {
  const px = parseFloat(level.px)
  const sz = parseFloat(level.sz)
  const pct = maxCumSize > 0 ? (cumSize / maxCumSize) * 100 : 0
  const isBid = side === 'bid'

  return (
    <div className="relative flex items-center justify-between px-2 py-[3px] hover:bg-bg-hover cursor-default text-xs">
      {/* Depth bar anchored left */}
      <div
        className={`absolute top-0 bottom-0 left-0 opacity-20 ${isBid ? 'bg-long' : 'bg-short'}`}
        style={{ width: `${pct}%` }}
      />
      <span className={`font-mono z-10 tabular-nums ${isBid ? 'text-long' : 'text-short'}`}>
        {fmtPrice(px)}
      </span>
      <span className="font-mono z-10 text-text-secondary tabular-nums">{fmtSize(sz)}</span>
    </div>
  )
}

export function OrderBook({ bids, asks, markPrice, spread }: OrderBookProps) {
  const N = 12
  const displayAsks = asks.slice(0, N).reverse()
  const displayBids = bids.slice(0, N)

  const { askCums, bidCums, maxCum } = useMemo(() => {
    const askSizes = asks.slice(0, N).map(l => parseFloat(l.sz))
    const bidSizes = bids.slice(0, N).map(l => parseFloat(l.sz))

    const askCumsRaw: number[] = []
    askSizes.forEach((s, i) => askCumsRaw.push((askCumsRaw[i - 1] || 0) + s))
    const askCumsReversed = [...askCumsRaw].reverse()

    const bidCums: number[] = []
    bidSizes.forEach((s, i) => bidCums.push((bidCums[i - 1] || 0) + s))

    const maxCum = Math.max(askCumsRaw[askCumsRaw.length - 1] || 0, bidCums[bidCums.length - 1] || 0)

    return { askCums: askCumsReversed, bidCums, maxCum }
  }, [bids, asks])

  const spreadPct = markPrice > 0 ? ((spread / markPrice) * 100).toFixed(3) : '0.000'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-primary flex-shrink-0">
        <span className="text-2xs text-text-muted uppercase tracking-wider">Price</span>
        <span className="text-2xs text-text-muted uppercase tracking-wider">Size</span>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Asks */}
        <div className="flex-1 flex flex-col justify-end overflow-hidden">
          {displayAsks.map((level, i) => (
            <OBRow
              key={`ask-${i}`}
              level={level}
              side="ask"
              cumSize={askCums[i]}
              maxCumSize={maxCum}
            />
          ))}
        </div>

        {/* Mark price + spread */}
        <div className="flex items-center justify-between px-2 py-1.5 border-y border-border-primary bg-bg-tertiary flex-shrink-0">
          <span className={`font-mono text-sm font-semibold ${spread >= 0 ? 'text-text-primary' : 'text-text-primary'}`}>
            ${markPrice > 0 ? fmtPrice(markPrice) : '—'}
          </span>
          <span className="text-2xs text-text-muted">{spreadPct}%</span>
        </div>

        {/* Bids */}
        <div className="flex-1 overflow-hidden">
          {displayBids.map((level, i) => (
            <OBRow
              key={`bid-${i}`}
              level={level}
              side="bid"
              cumSize={bidCums[i]}
              maxCumSize={maxCum}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
