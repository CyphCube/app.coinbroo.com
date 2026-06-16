'use client'

import { useEffect, useRef, useState } from 'react'

const WS_URL = 'wss://api.hyperliquid.xyz/ws'

export interface OrderBookLevel {
  px: string
  sz: string
  n: number
}

export interface OrderBook {
  coin: string
  levels: [OrderBookLevel[], OrderBookLevel[]] // [bids, asks]
  time: number
}

export interface Trade {
  coin: string
  side: string
  px: string
  sz: string
  time: number
  tid: number
}

export interface AllMids {
  [coin: string]: string
}

interface UseHLWebSocketOptions {
  activeCoin: string
  onOrderBook?: (data: OrderBook) => void
  onTrade?: (data: Trade[]) => void
  onAllMids?: (data: AllMids) => void
}

export function useHLWebSocket({ activeCoin, onOrderBook, onTrade, onAllMids }: UseHLWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const subscribedCoin = useRef<string | null>(null)
  const readyRef = useRef(false)
  const [connected, setConnected] = useState(false)

  // Callbacks via refs so changing them never triggers a reconnect
  const onOrderBookRef = useRef(onOrderBook)
  const onTradeRef = useRef(onTrade)
  const onAllMidsRef = useRef(onAllMids)
  useEffect(() => { onOrderBookRef.current = onOrderBook }, [onOrderBook])
  useEffect(() => { onTradeRef.current = onTrade }, [onTrade])
  useEffect(() => { onAllMidsRef.current = onAllMids }, [onAllMids])

  // Persistent connection — subscribes to allMids once
  useEffect(() => {
    if (typeof window === 'undefined') return

    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        readyRef.current = true
        ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'allMids' } }))
        // (re)subscribe to the active coin's book + trades
        subscribedCoin.current = null
        subscribeCoin(activeCoinRef.current)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (!msg.data) return
          if (msg.channel === 'l2Book') onOrderBookRef.current?.(msg.data)
          else if (msg.channel === 'trades') onTradeRef.current?.(msg.data)
          else if (msg.channel === 'allMids') onAllMidsRef.current?.(msg.data.mids)
        } catch { /* ignore malformed */ }
      }

      ws.onclose = () => {
        setConnected(false)
        readyRef.current = false
        reconnectTimer.current = setTimeout(connect, 2000)
      }

      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track active coin in a ref so reconnect can re-subscribe
  const activeCoinRef = useRef(activeCoin)
  useEffect(() => { activeCoinRef.current = activeCoin }, [activeCoin])

  function subscribeCoin(coin: string) {
    const ws = wsRef.current
    if (!ws || !readyRef.current || !coin) return
    if (subscribedCoin.current === coin) return
    // Unsubscribe previous
    if (subscribedCoin.current) {
      ws.send(JSON.stringify({ method: 'unsubscribe', subscription: { type: 'l2Book', coin: subscribedCoin.current } }))
      ws.send(JSON.stringify({ method: 'unsubscribe', subscription: { type: 'trades', coin: subscribedCoin.current } }))
    }
    ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'l2Book', coin } }))
    ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'trades', coin } }))
    subscribedCoin.current = coin
  }

  // Re-subscribe when the active coin changes
  useEffect(() => {
    subscribeCoin(activeCoin)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCoin, connected])

  return { connected }
}
