'use client'

import { useEffect, useState } from 'react'
import {
  getMetaAndAssetCtxs,
  getSpotMetaAndAssetCtxs,
} from '@/lib/hyperliquid'

export type MarketCategory = 'Perps' | 'Spot'

export interface UnifiedMarket {
  coin: string          // id used for l2Book / WS subscriptions
  display: string       // short label shown in UI
  category: MarketCategory
  price: number
  prevDayPx: number
  change24h: number
  volume24h: number
  funding: number
  openInterest: number
  maxLeverage: number
  szDecimals: number
  assetIndex: number    // trading asset id (perp index, or 10000+spot index)
  tradable: boolean
  hasTvChart: boolean   // TradingView/Bybit symbol available
  kind: 'perp' | 'spot'
  baseToken?: string    // spot base token name (e.g. "PURR")
}

function num(s: string | undefined) { return s ? parseFloat(s) : 0 }

export function useMarkets() {
  const [markets, setMarkets] = useState<UnifiedMarket[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const results: UnifiedMarket[] = []

      // 1. Core perps
      try {
        const [meta, ctxs] = await getMetaAndAssetCtxs()
        meta.universe.forEach((u, i) => {
          const c = ctxs[i]
          if (!c || (u as { isDelisted?: boolean }).isDelisted) return
          const price = num(c.markPx)
          const prev = num(c.prevDayPx)
          results.push({
            coin: u.name,
            display: u.name,
            category: 'Perps',
            price,
            prevDayPx: prev,
            change24h: prev > 0 ? ((price - prev) / prev) * 100 : 0,
            volume24h: num(c.dayNtlVlm),
            funding: num(c.funding),
            openInterest: num(c.openInterest),
            maxLeverage: u.maxLeverage,
            szDecimals: u.szDecimals,
            assetIndex: i,
            tradable: true,
            hasTvChart: true,
            kind: 'perp',
          })
        })
      } catch { /* ignore */ }

      // 2. Spot — asset id for trading = 10000 + pair index
      try {
        const [spotMeta, spotCtxs] = await getSpotMetaAndAssetCtxs()
        const tokenByIndex: Record<number, { name: string; szDecimals: number }> = {}
        spotMeta.tokens.forEach(t => { tokenByIndex[t.index] = { name: t.name, szDecimals: t.szDecimals } })
        spotMeta.universe.forEach((pair, i) => {
          const c = spotCtxs[i]
          if (!c) return
          const price = num(c.markPx)
          const prev = num(c.prevDayPx)
          const baseTokenIdx = pair.tokens[0]
          const baseTok = tokenByIndex[baseTokenIdx]
          const base = baseTok?.name || pair.name.split('/')[0]
          results.push({
            coin: c.coin || pair.name,
            display: base,
            category: 'Spot',
            price,
            prevDayPx: prev,
            change24h: prev > 0 ? ((price - prev) / prev) * 100 : 0,
            volume24h: num(c.dayNtlVlm),
            funding: 0,
            openInterest: 0,
            maxLeverage: 0,
            szDecimals: baseTok?.szDecimals ?? 2,
            assetIndex: 10000 + pair.index,
            tradable: true,
            hasTvChart: false,
            kind: 'spot',
            baseToken: base,
          })
        })
      } catch { /* ignore */ }

      if (!cancelled) setMarkets(results)
    }

    load()
    const interval = setInterval(load, 20000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return markets
}
