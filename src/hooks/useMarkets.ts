'use client'

import { useEffect, useState } from 'react'
import {
  getMetaAndAssetCtxs,
  getSpotMetaAndAssetCtxs,
} from '@/lib/hyperliquid'
import { COINBROO_VERIFIED_SPOT } from '@/lib/verifiedTokens'

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
  marketCap?: number    // spot only
  verified: boolean     // passes Strict filter (perp, HL-canonical, or Coinbroo-approved)
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
            verified: true,
          })
        })
      } catch { /* ignore */ }

      // 2. Spot — asset id for trading = 10000 + pair index.
      // NOTE: spotCtxs is NOT positionally aligned with universe; match by coin id.
      try {
        const [spotMeta, spotCtxs] = await getSpotMetaAndAssetCtxs()
        const tokenByIndex: Record<number, { name: string; szDecimals: number; fullName?: string | null }> = {}
        spotMeta.tokens.forEach(t => { tokenByIndex[t.index] = { name: t.name, szDecimals: t.szDecimals, fullName: t.fullName } })
        const ctxByCoin: Record<string, typeof spotCtxs[number]> = {}
        spotCtxs.forEach(c => { if (c && c.coin) ctxByCoin[c.coin] = c })

        spotMeta.universe.forEach((pair) => {
          // canonical pairs key on their name (e.g. "PURR/USDC"); others on "@index"
          const coinKey = (pair as { isCanonical?: boolean }).isCanonical ? pair.name : `@${pair.index}`
          const c = ctxByCoin[coinKey]
          if (!c) return
          const price = num(c.markPx)
          const prev = num(c.prevDayPx)
          const baseTok = tokenByIndex[pair.tokens[0]]
          const base = baseTok?.name || pair.name.split('/')[0]
          const isCanonical = (pair as { isCanonical?: boolean }).isCanonical ?? false
          // Unit-bridged assets (fullName "Unit Bitcoin", …) show their original
          // ticker like Hyperliquid: UBTC → BTC, UETH → ETH, USOL → SOL.
          const isUnit = baseTok?.fullName?.startsWith('Unit ') ?? false
          const display = isUnit ? base.replace(/^U+/, '') : base
          results.push({
            coin: coinKey,
            display,
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
            marketCap: num(c.circulatingSupply) * price,
            verified: isCanonical || COINBROO_VERIFIED_SPOT.has(base),
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
