'use client'

import { useState, useEffect, useCallback } from 'react'
import { NavBar } from '@/components/layout/NavBar'
import { TopBar } from '@/components/layout/TopBar'
import { OrderBook } from '@/components/trading/OrderBook'
import { TradePanel } from '@/components/trading/TradePanel'
import { Positions } from '@/components/trading/Positions'
import { useHLWebSocket } from '@/hooks/useHLWebSocket'
import { useAutoDisconnect } from '@/hooks/useAutoDisconnect'
import { getMetaAndAssetCtxs, getBaseFees } from '@/lib/hyperliquid'
import type { OrderBook as OBType, Trade } from '@/hooks/useHLWebSocket'
import type { AssetCtx } from '@/lib/hyperliquid'

interface MetaUniverse {
  name: string
  szDecimals: number
  maxLeverage: number
  isDelisted?: boolean
}

interface Meta {
  universe: MetaUniverse[]
}

export default function TradingPage() {
  const [selectedCoin, setSelectedCoin] = useState('BTC')
  const [meta, setMeta] = useState<Meta>({ universe: [] })
  const [assetCtxMap, setAssetCtxMap] = useState<Record<string, AssetCtx>>({})
  const [mids, setMids] = useState<Record<string, number>>({})
  // Store order books per coin so switching is instant
  const [orderBooks, setOrderBooks] = useState<Record<string, OBType>>({})
  const [trades, setTrades] = useState<Record<string, Trade[]>>({})
  const [baseFees, setBaseFees] = useState({ taker: 0.00045, maker: 0.00015 })
  useAutoDisconnect()

  useEffect(() => {
    function loadCtxs(seed: boolean) {
      getMetaAndAssetCtxs().then(([m, ctxs]) => {
        if (m?.universe) setMeta(m)
        const ctxMap: Record<string, AssetCtx> = {}
        const seedMids: Record<string, number> = {}
        m.universe.forEach((asset, i) => {
          if (ctxs[i]) {
            ctxMap[asset.name] = ctxs[i]
            seedMids[asset.name] = parseFloat(ctxs[i].markPx)
          }
        })
        setAssetCtxMap(ctxMap)
        if (seed) setMids(prev => ({ ...seedMids, ...prev }))
      })
    }
    loadCtxs(true)
    getBaseFees().then(setBaseFees)
    // Refresh funding/volume/OI every 15s (prices come live via WS)
    const interval = setInterval(() => loadCtxs(false), 15000)
    return () => clearInterval(interval)
  }, [])

  const handleOrderBook = useCallback((data: OBType) => {
    setOrderBooks(prev => ({ ...prev, [data.coin]: data }))
  }, [])

  const handleTrade = useCallback((data: Trade[]) => {
    if (!data.length) return
    const coin = data[0].coin
    setTrades(prev => {
      const existing = prev[coin] || []
      // newest first, cap at 40
      const merged = [...data.reverse(), ...existing].slice(0, 40)
      return { ...prev, [coin]: merged }
    })
  }, [])

  const handleAllMids = useCallback((data: Record<string, string>) => {
    setMids(prev => {
      const next = { ...prev }
      Object.entries(data).forEach(([k, v]) => { next[k] = parseFloat(v) })
      return next
    })
  }, [])

  useHLWebSocket({ activeCoin: selectedCoin, onOrderBook: handleOrderBook, onTrade: handleTrade, onAllMids: handleAllMids })

  const currentAsset = meta.universe.find(u => u.name === selectedCoin)
  const currentCtx = assetCtxMap[selectedCoin]
  const markPrice = mids[selectedCoin] || 0
  const prevDayPx = currentCtx ? parseFloat(currentCtx.prevDayPx) : 0
  const change24h = prevDayPx > 0 ? ((markPrice - prevDayPx) / prevDayPx) * 100 : 0
  const funding = currentCtx ? parseFloat(currentCtx.funding) : 0
  const volume24h = currentCtx ? parseFloat(currentCtx.dayNtlVlm) : 0
  const openInterest = currentCtx ? parseFloat(currentCtx.openInterest) : 0

  const markets = meta.universe
    .filter(u => mids[u.name] && !u.isDelisted)
    .map(u => {
      const c = u.name
      const ctx = assetCtxMap[c]
      const prev = ctx ? parseFloat(ctx.prevDayPx) : 0
      const price = mids[c]
      return {
        name: c,
        price,
        change24h: prev > 0 ? ((price - prev) / prev) * 100 : 0,
        volume24h: ctx ? parseFloat(ctx.dayNtlVlm) : 0,
        funding: ctx ? parseFloat(ctx.funding) : 0,
        maxLeverage: u.maxLeverage,
      }
    })
    .sort((a, b) => b.volume24h - a.volume24h)

  const currentOB = orderBooks[selectedCoin]
  const bids = currentOB?.levels?.[0] || []
  const asks = currentOB?.levels?.[1] || []
  const topBid = bids[0] ? parseFloat(bids[0].px) : markPrice * 0.9995
  const topAsk = asks[0] ? parseFloat(asks[0].px) : markPrice * 1.0005
  const spread = topAsk - topBid

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      <NavBar />
      <TopBar
        selectedMarket={selectedCoin}
        markPrice={markPrice}
        change24h={change24h}
        prevDayPx={prevDayPx}
        funding={funding}
        volume24h={volume24h}
        openInterest={openInterest}
        maxLeverage={currentAsset?.maxLeverage || 50}
        markets={markets}
        onSelectMarket={setSelectedCoin}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Chart */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <iframe
            key={selectedCoin}
            src={`https://www.tradingview.com/widgetembed/?symbol=BYBIT%3A${selectedCoin}USDT.P&interval=15&theme=dark&style=1&locale=en&hide_side_toolbar=0&allow_symbol_change=0`}
            className="w-full h-full border-0"
          />
        </div>

        {/* Order book — right side, like Hyperliquid */}
        <div className="w-52 flex-shrink-0 border-l border-border-primary hidden md:flex flex-col">
          <OrderBook
            coin={selectedCoin}
            bids={bids}
            asks={asks}
            markPrice={markPrice}
            spread={spread}
            trades={trades[selectedCoin] || []}
            szDecimals={currentAsset?.szDecimals ?? 2}
          />
        </div>

        {/* Trade panel */}
        <div className="w-60 flex-shrink-0 border-l border-border-primary flex flex-col min-h-0">
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
