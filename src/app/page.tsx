'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { OrderBook } from '@/components/trading/OrderBook'
import { TradePanel } from '@/components/trading/TradePanel'
import { Positions } from '@/components/trading/Positions'
import { MarketList } from '@/components/trading/MarketList'
import { useHLWebSocket } from '@/hooks/useHLWebSocket'
import { useAutoDisconnect } from '@/hooks/useAutoDisconnect'
import { getMetaAndAssetCtxs, getBaseFees } from '@/lib/hyperliquid'
import type { OrderBook as OBType } from '@/hooks/useHLWebSocket'
import type { AssetCtx } from '@/lib/hyperliquid'

const DEFAULT_COINS = ['BTC', 'ETH', 'SOL', 'ARB', 'AVAX', 'HYPE', 'SUI', 'WIF', 'PEPE', 'DOGE']

interface MetaUniverse {
  name: string
  szDecimals: number
  maxLeverage: number
}

interface Meta {
  universe: MetaUniverse[]
}

export default function TradingPage() {
  const [selectedCoin, setSelectedCoin] = useState('BTC')
  const [meta, setMeta] = useState<Meta>({ universe: [] })
  const [assetCtxMap, setAssetCtxMap] = useState<Record<string, AssetCtx>>({})
  const [mids, setMids] = useState<Record<string, number>>({})
  const [orderBook, setOrderBook] = useState<OBType | null>(null)
  const [baseFees, setBaseFees] = useState({ taker: 0.00045, maker: 0.00015 })
  useAutoDisconnect()

  useEffect(() => {
    getMetaAndAssetCtxs().then(([m, ctxs]) => {
      if (m?.universe) setMeta(m)
      const ctxMap: Record<string, AssetCtx> = {}
      m.universe.forEach((asset, i) => {
        if (ctxs[i]) ctxMap[asset.name] = ctxs[i]
      })
      setAssetCtxMap(ctxMap)
      // Seed mids from markPx
      const seedMids: Record<string, number> = {}
      m.universe.forEach((asset, i) => {
        if (ctxs[i]) seedMids[asset.name] = parseFloat(ctxs[i].markPx)
      })
      setMids(seedMids)
    })
    getBaseFees().then(setBaseFees)
  }, [])

  const handleOrderBook = useCallback((data: OBType) => {
    if (data.coin === selectedCoin) setOrderBook(data)
  }, [selectedCoin])

  const handleAllMids = useCallback((data: Record<string, string>) => {
    setMids(prev => {
      const next: Record<string, number> = { ...prev }
      Object.entries(data).forEach(([k, v]) => { next[k] = parseFloat(v) })
      return next
    })
  }, [])

  useHLWebSocket({ coins: DEFAULT_COINS, onOrderBook: handleOrderBook, onAllMids: handleAllMids })

  const currentAsset = meta.universe.find(u => u.name === selectedCoin)
  const currentCtx = assetCtxMap[selectedCoin]
  const markPrice = mids[selectedCoin] || 0
  const prevDayPx = currentCtx ? parseFloat(currentCtx.prevDayPx) : 0
  const change24h = prevDayPx > 0 ? ((markPrice - prevDayPx) / prevDayPx) * 100 : 0
  const funding = currentCtx ? parseFloat(currentCtx.funding) : 0
  const volume24h = currentCtx ? parseFloat(currentCtx.dayNtlVlm) : 0
  const openInterest = currentCtx ? parseFloat(currentCtx.openInterest) : 0

  const markets = DEFAULT_COINS
    .filter(c => mids[c])
    .map(c => {
      const ctx = assetCtxMap[c]
      const prev = ctx ? parseFloat(ctx.prevDayPx) : 0
      const price = mids[c]
      return {
        name: c,
        price,
        change24h: prev > 0 ? ((price - prev) / prev) * 100 : 0,
        volume24h: ctx ? parseFloat(ctx.dayNtlVlm) : 0,
        funding: ctx ? parseFloat(ctx.funding) : 0,
      }
    })

  const bids = orderBook?.levels?.[0] || []
  const asks = orderBook?.levels?.[1] || []
  const topBid = bids[0] ? parseFloat(bids[0].px) : markPrice * 0.9995
  const topAsk = asks[0] ? parseFloat(asks[0].px) : markPrice * 1.0005
  const spread = topAsk - topBid

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      <TopBar
        selectedMarket={selectedCoin}
        markPrice={markPrice}
        change24h={change24h}
        prevDayPx={prevDayPx}
        funding={funding}
        volume24h={volume24h}
        openInterest={openInterest}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Market list */}
        <div className="w-44 flex-shrink-0 border-r border-border-primary hidden lg:flex flex-col">
          <MarketList
            markets={markets}
            selected={selectedCoin}
            onSelect={setSelectedCoin}
          />
        </div>

        {/* Order book */}
        <div className="w-44 flex-shrink-0 border-r border-border-primary hidden md:flex flex-col">
          <OrderBook bids={bids} asks={asks} markPrice={markPrice} spread={spread} />
        </div>

        {/* Chart */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <iframe
              key={selectedCoin}
              src={`https://www.tradingview.com/widgetembed/?symbol=BYBIT%3A${selectedCoin}USDT.P&interval=15&theme=dark&style=1&locale=en&hide_side_toolbar=0&allow_symbol_change=0`}
              className="w-full h-full border-0"
            />
          </div>
        </div>

        {/* Trade panel */}
        <div className="w-56 flex-shrink-0 border-l border-border-primary flex flex-col">
          <TradePanel
            coin={selectedCoin}
            markPrice={markPrice}
            assetIndex={meta.universe.findIndex(u => u.name === selectedCoin)}
            maxLeverage={currentAsset?.maxLeverage || 50}
            baseTakerFee={baseFees.taker}
            baseMakerFee={baseFees.maker}
            onOrderPlaced={() => {}}
          />
        </div>
      </div>

      {/* Positions bar */}
      <div className="h-44 border-t border-border-primary flex-shrink-0 bg-bg-secondary">
        <Positions markPrices={mids} meta={meta} />
      </div>
    </div>
  )
}
