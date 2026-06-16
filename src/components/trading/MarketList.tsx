'use client'

import { useState } from 'react'

interface Market {
  name: string
  price: number
  change24h: number
  volume24h: number
  funding: number
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

export function MarketList({ markets, selected, onSelect }: MarketListProps) {
  const [search, setSearch] = useState('')

  const filtered = markets.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-2 py-2 border-b border-border-primary flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full bg-bg-tertiary border border-border-primary rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-secondary"
        />
      </div>

      {/* Column labels */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border-primary flex-shrink-0">
        <span className="text-2xs text-text-muted">Market</span>
        <span className="text-2xs text-text-muted">Price / Chg</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(m => {
          const isUp = m.change24h >= 0
          const isSelected = m.name === selected
          const fundingPositive = m.funding >= 0

          return (
            <button
              key={m.name}
              onClick={() => onSelect(m.name)}
              className={`w-full flex items-center justify-between px-2 py-2 border-b border-border-primary/40 transition-colors hover:bg-bg-hover text-left ${
                isSelected ? 'bg-bg-hover border-l-2 border-l-accent-blue' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{m.name}</p>
                <p className="text-2xs text-text-muted mt-0.5">
                  f:{' '}
                  <span className={fundingPositive ? 'text-long' : 'text-short'}>
                    {fundingPositive ? '+' : ''}{(m.funding * 100).toFixed(4)}%
                  </span>
                </p>
              </div>
              <div className="text-right ml-1">
                <p className="font-mono text-xs text-text-primary">${fmtPrice(m.price)}</p>
                <p className={`text-2xs font-mono mt-0.5 ${isUp ? 'text-long' : 'text-short'}`}>
                  {isUp ? '+' : ''}{m.change24h.toFixed(2)}%
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
