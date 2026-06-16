'use client'

import { useState } from 'react'
import type { UnifiedMarket, MarketCategory } from '@/hooks/useMarkets'

interface MarketListProps {
  markets: UnifiedMarket[]
  selected: string
  onSelect: (coin: string) => void
}

function fmtPrice(p: number) {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (p >= 1) return p.toFixed(3)
  return p.toFixed(5)
}

function fmtUsd(n: number) {
  if (n <= 0) return '—'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtVol(n: number) {
  return '$' + Math.max(0, n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const TAB_ORDER: (MarketCategory | 'All')[] = ['All', 'Perps', 'Spot']

type SortKey = 'symbol' | 'price' | 'change' | 'funding' | 'volume' | 'oi'
type SortDir = 'asc' | 'desc'

export function MarketList({ markets, selected, onSelect }: MarketListProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<MarketCategory | 'All'>('All')
  const [strict, setStrict] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('volume')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const spotView = category === 'Spot'

  const available = TAB_ORDER.filter(t => t === 'All' || markets.some(m => m.category === t))

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'symbol' ? 'asc' : 'desc')
    }
  }

  function sortVal(m: UnifiedMarket, key: SortKey): number | string {
    switch (key) {
      case 'symbol': return m.display.toLowerCase()
      case 'price': return m.price
      case 'change': return m.change24h
      case 'funding': return m.funding
      case 'volume': return m.volume24h
      case 'oi': return spotView ? (m.marketCap || 0) : m.openInterest * m.price
    }
  }

  let list = markets.filter(m => {
    const matchesCat = category === 'All' || m.category === category
    const q = search.toLowerCase()
    const matchesSearch = m.display.toLowerCase().includes(q) || m.coin.toLowerCase().includes(q)
    // Strict hides dead / zero-volume (spammy) markets
    const matchesStrict = !strict || m.volume24h > 0
    return matchesCat && matchesSearch && matchesStrict
  })
  list = list.slice().sort((a, b) => {
    const va = sortVal(a, sortKey)
    const vb = sortVal(b, sortKey)
    let cmp: number
    if (typeof va === 'string' && typeof vb === 'string') cmp = va.localeCompare(vb)
    else cmp = (va as number) - (vb as number)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const pairSuffix = (m: UnifiedMarket) => (m.kind === 'spot' ? '/USDC' : '-USDC')

  const gridCols = spotView
    ? 'grid-cols-[1.6fr_1fr_1.3fr_1.1fr_1.3fr]'
    : 'grid-cols-[1.6fr_1fr_1.3fr_0.9fr_1.1fr_1.1fr]'

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 'desc' ? '▾' : '▴') : '')

  function SortHeader({ label, k, align = 'right' }: { label: string; k: SortKey; align?: 'left' | 'right' }) {
    const active = sortKey === k
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`flex items-center gap-0.5 text-2xs hover:text-text-secondary transition-colors ${
          align === 'right' ? 'justify-end' : 'justify-start'
        } ${active ? 'text-text-primary' : 'text-text-muted'}`}
      >
        <span>{label}</span>
        <span className="w-2 text-accent-blue">{arrow(k)}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search + Strict/All */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-primary flex-shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="w-full bg-bg-tertiary border border-border-primary rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-secondary"
          />
        </div>
        {/* Strict / All toggle */}
        <div className="flex items-center bg-bg-tertiary rounded-lg p-0.5 flex-shrink-0">
          {(['Strict', 'All'] as const).map(opt => {
            const isStrict = opt === 'Strict'
            const active = strict === isStrict
            return (
              <button
                key={opt}
                onClick={() => setStrict(isStrict)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  active ? 'bg-accent-blue text-bg-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border-primary flex-shrink-0 overflow-x-auto">
        {available.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
              category === c ? 'text-accent-blue border-b-2 border-accent-blue rounded-none' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Table header (sortable) */}
      <div className={`grid ${gridCols} px-3 py-1.5 border-b border-border-primary flex-shrink-0`}>
        <SortHeader label="Symbol" k="symbol" align="left" />
        <SortHeader label="Last Price" k="price" />
        <SortHeader label="24h Change" k="change" />
        {!spotView && <SortHeader label="8h Funding" k="funding" />}
        <SortHeader label="Volume" k="volume" />
        <SortHeader label={spotView ? 'Market Cap' : 'Open Interest'} k="oi" />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-text-muted">No markets</div>
        ) : (
          list.map(m => {
            const isUp = m.change24h >= 0
            const isSelected = m.coin === selected
            const absChg = m.prevDayPx > 0 ? m.price - m.prevDayPx : 0
            return (
              <button
                key={m.coin}
                onClick={() => onSelect(m.coin)}
                className={`w-full grid ${gridCols} items-center px-3 py-2 border-b border-border-primary/40 transition-colors hover:bg-bg-hover text-left ${
                  isSelected ? 'bg-bg-hover' : ''
                }`}
              >
                {/* Symbol */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-text-primary truncate">{m.display}{pairSuffix(m)}</span>
                  {m.maxLeverage > 0 && (
                    <span className="text-[9px] text-text-secondary bg-bg-tertiary px-1 py-0.5 rounded leading-none flex-shrink-0">{m.maxLeverage}x</span>
                  )}
                  {m.kind === 'spot' && (
                    <span className="text-[9px] text-accent-blue bg-bg-tertiary px-1 py-0.5 rounded leading-none flex-shrink-0">SPOT</span>
                  )}
                </div>
                {/* Last price */}
                <span className="text-sm font-mono text-text-primary text-right tabular-nums">{fmtPrice(m.price)}</span>
                {/* 24h change */}
                <span className={`text-xs font-mono text-right tabular-nums ${isUp ? 'text-long' : 'text-short'}`}>
                  {absChg !== 0 ? `${isUp ? '+' : ''}${fmtPrice(Math.abs(absChg))} / ` : ''}{isUp ? '+' : ''}{m.change24h.toFixed(2)}%
                </span>
                {/* Funding — perps view only */}
                {!spotView && (
                  <span className="text-xs font-mono text-text-secondary text-right tabular-nums">
                    {m.kind === 'perp' ? `${(m.funding * 100).toFixed(4)}%` : '—'}
                  </span>
                )}
                {/* Volume */}
                <span className="text-xs font-mono text-text-secondary text-right tabular-nums">{fmtVol(m.volume24h)}</span>
                {/* Market Cap (spot) or Open Interest (perps) */}
                <span className="text-xs font-mono text-text-secondary text-right tabular-nums">
                  {spotView
                    ? (m.marketCap ? fmtUsd(m.marketCap) : '—')
                    : (m.kind === 'perp' ? fmtUsd(m.openInterest * m.price) : '—')}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
