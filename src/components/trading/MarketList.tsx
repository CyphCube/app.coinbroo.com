'use client'

import { useState } from 'react'

interface Market {
  name: string
  price: number
  change24h: number
  volume24h: number
  funding: number
  maxLeverage: number
}

interface MarketListProps {
  markets: Market[]
  selected: string
  onSelect: (coin: string) => void
}

function fmtPrice(p: number) {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (p >= 1) return p.toFixed(3)
  return p.toFixed(5)
}

function fmtVol(n: number) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  return '$' + n.toFixed(0)
}

const CATEGORIES = ['Perps', 'Spot', 'Trending'] as const
type Category = typeof CATEGORIES[number]

export function MarketList({ markets, selected, onSelect }: MarketListProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('Perps')

  let list = markets.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
  if (category === 'Trending') list = [...list].sort((a, b) => b.volume24h - a.volume24h).slice(0, 15)

  const isComingSoon = category === 'Spot'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="px-2 py-2 border-b border-border-primary flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search markets..."
          className="w-full bg-bg-tertiary border border-border-primary rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-secondary"
        />
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border-primary flex-shrink-0 overflow-x-auto">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-2 py-0.5 text-2xs rounded font-medium whitespace-nowrap transition-colors ${
              category === c ? 'bg-bg-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Column labels */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border-primary flex-shrink-0">
        <span className="text-2xs text-text-muted uppercase tracking-wider">Market</span>
        <span className="text-2xs text-text-muted uppercase tracking-wider">Last / Chg</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isComingSoon ? (
          <div className="flex items-center justify-center h-full text-2xs text-text-muted px-3 text-center">
            Spot markets coming soon
          </div>
        ) : (
          list.map(m => {
            const isUp = m.change24h >= 0
            const isSelected = m.name === selected
            return (
              <button
                key={m.name}
                onClick={() => onSelect(m.name)}
                className={`w-full flex items-center justify-between px-2 py-1.5 border-b border-border-primary/40 transition-colors hover:bg-bg-hover text-left ${
                  isSelected ? 'bg-bg-hover border-l-2 border-l-accent-blue' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-text-primary truncate">{m.name}</span>
                    <span className="text-[8px] text-text-muted bg-bg-tertiary px-1 rounded leading-tight">{m.maxLeverage}x</span>
                  </div>
                  <p className="text-2xs text-text-muted mt-0.5">{fmtVol(m.volume24h)}</p>
                </div>
                <div className="text-right ml-1">
                  <p className="font-mono text-xs text-text-primary">${fmtPrice(m.price)}</p>
                  <p className={`text-2xs font-mono mt-0.5 ${isUp ? 'text-long' : 'text-short'}`}>
                    {isUp ? '+' : ''}{m.change24h.toFixed(2)}%
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
