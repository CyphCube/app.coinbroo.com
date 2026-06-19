'use client'

import { useState } from 'react'

// Thousand-denominated perps (kPEPE, kBONK, kSHIB…) have no icon of their own;
// like Hyperliquid, use the underlying token's icon (kPEPE → PEPE).
function iconSymbol(symbol: string): string {
  return /^k[A-Z]/.test(symbol) ? symbol.slice(1) : symbol
}

// Round token logo from Hyperliquid's coin-icon CDN (the same icons Hyperliquid
// itself uses), with a lettered fallback when no icon is available.
export function TokenLogo({ symbol, size }: { symbol: string; size: number }) {
  const [errored, setErrored] = useState(false)
  const [loadedSymbol, setLoadedSymbol] = useState(symbol)

  // The instance is reused across market switches (e.g. in the TopBar); reset
  // the error flag whenever the symbol changes.
  if (symbol !== loadedSymbol) {
    setLoadedSymbol(symbol)
    setErrored(false)
  }

  if (!symbol || errored) {
    return (
      <div
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        className="rounded-full bg-bg-tertiary flex items-center justify-center font-bold text-text-secondary flex-shrink-0"
      >
        {symbol ? symbol[0] : '?'}
      </div>
    )
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      key={symbol}
      src={`https://app.hyperliquid.xyz/coins/${iconSymbol(symbol)}.svg`}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      className="rounded-full flex-shrink-0"
    />
  )
}
