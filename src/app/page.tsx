'use client'

import { useState, useCallback, useMemo } from 'react'
import { NavBar } from '@/components/layout/NavBar'
import { TopBar } from '@/components/layout/TopBar'
import { OrderBook } from '@/components/trading/OrderBook'
import { TradePanel } from '@/components/trading/TradePanel'
import { Positions } from '@/components/trading/Positions'
import { useHLWebSocket } from '@/hooks/useHLWebSocket'
import { useAutoDisconnect } from '@/hooks/useAutoDisconnect'
import { useMarkets } from '@/hooks/useMarkets'
import { useBaseFees } from '@/hooks/useBaseFees'
import type { OrderBook as OBType, Trade } from '@/hooks/useHLWebSocket'

export default function TradingPage() {
  const [selectedCoin, setSelectedCoin] = useState('BTC')
  const [mids, setMids] = useState<Record<string, number>>({})
  const [orderBooks, setOrderBooks] = useState<Record<string, OBType>>({})
  const [trades, setTrades] = useState<Record<string, Trade[]>>({})
  useAutoDisconnect()

  const markets = useMarkets()
  const baseFees = useBaseFees()

  const marketByCoin = useMemo(() => {
    const m: Record<string, (typeof markets)[number]> = {}
    markets.forEach(mk => { m[mk.coin] = mk })
    return m
  }, [markets])

  // Coin → core-perp asset index (for closing positions)
  const assetIndexMap = useMemo(() => {
    const m: Record<string, number> = {}
    markets.forEach(mk => { if (mk.kind === 'perp') m[mk.coin] = mk.assetIndex })
    return m
  }, [markets])

  const handleOrderBook = useCallback((data: OBType) => {
    setOrderBooks(prev => ({ ...prev, [data.coin]: data }))
  }, [])

  const handleTrade = useCallback((data: Trade[]) => {
    if (!data.length) return
    const coin = data[0].coin
    setTrades(prev => {
      const existing = prev[coin] || []
      return { ...prev, [coin]: [...data.slice().reverse(), ...existing].slice(0, 40) }
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

  const market = marketByCoin[selectedCoin]
  const currentOB = orderBooks[selectedCoin]
  const bids = currentOB?.levels?.[0] || []
  const asks = currentOB?.levels?.[1] || []
  const topBid = bids[0] ? parseFloat(bids[0].px) : 0
  const topAsk = asks[0] ? parseFloat(asks[0].px) : 0
  const bookMid = topBid && topAsk ? (topBid + topAsk) / 2 : 0

  // Live price: perps via allMids WS; spot/dex via order-book mid, fallback to polled price
  const markPrice = market?.kind === 'perp'
    ? (mids[selectedCoin] || market?.price || 0)
    : (bookMid || market?.price || 0)

  const change24h = market && market.prevDayPx > 0 ? ((markPrice - market.prevDayPx) / market.prevDayPx) * 100 : (market?.change24h || 0)
  const spread = topAsk && topBid ? topAsk - topBid : 0

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      <NavBar />
      <TopBar
        market={market}
        markPrice={markPrice}
        change24h={change24h}
        markets={markets}
        onSelectMarket={setSelectedCoin}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Chart */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {market?.hasTvChart ? (
            <iframe
              key={selectedCoin}
              src={`https://www.tradingview.com/widgetembed/?symbol=BYBIT%3A${market.display}USDT.P&interval=15&theme=dark&style=1&locale=en&hide_side_toolbar=0&allow_symbol_change=0`}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 px-6">
              <span className="text-text-primary font-semibold text-lg">{market?.display || selectedCoin}</span>
              <span className="font-mono text-2xl font-bold text-text-primary">
                ${markPrice > 0 ? markPrice.toLocaleString('en-US', { maximumFractionDigits: 6 }) : '—'}
              </span>
              <span className="text-xs text-text-muted max-w-xs">
                Chart not available for this market. Live order book and price shown on the right.
              </span>
            </div>
          )}
        </div>

        {/* Order book */}
        <div className="w-52 flex-shrink-0 border-l border-border-primary hidden md:flex flex-col">
          <OrderBook
            coin={market?.display || selectedCoin}
            bids={bids}
            asks={asks}
            markPrice={markPrice}
            spread={spread}
            trades={trades[selectedCoin] || []}
            szDecimals={market?.szDecimals ?? 2}
          />
        </div>

        {/* Trade panel */}
        <div className="w-60 flex-shrink-0 border-l border-border-primary flex flex-col min-h-0">
          <TradePanel
            coin={market?.display || selectedCoin}
            markPrice={markPrice}
            assetIndex={market?.assetIndex ?? -1}
            maxLeverage={market?.maxLeverage || 50}
            baseTakerFee={baseFees.taker}
            baseMakerFee={baseFees.maker}
            isSpot={market?.kind === 'spot'}
            szDecimals={market?.szDecimals ?? 4}
            baseToken={market?.baseToken}
            onOrderPlaced={() => {}}
          />
        </div>
      </div>

      {/* Positions bar */}
      <div className="border-t border-border-primary flex-shrink-0 bg-bg-secondary">
        <Positions markPrices={mids} assetIndexMap={assetIndexMap} />
      </div>
    </div>
  )
}
