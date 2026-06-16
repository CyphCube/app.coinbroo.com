'use client'

import { useState, useMemo } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { postExchange } from '@/lib/hyperliquid'
import { signOrder } from '@/lib/signing'
import { useAccount_HL } from '@/hooks/useAccountHL'
import { useOnboarding } from '@/hooks/useOnboarding'
import { OnboardingModal } from '@/components/ui/OnboardingModal'
import { BUILDER_FEE } from '@/lib/hyperliquid'

interface TradePanelProps {
  coin: string
  markPrice: number
  assetIndex: number
  maxLeverage: number
  baseTakerFee?: number
  baseMakerFee?: number
  onOrderPlaced?: () => void
}

type Side = 'long' | 'short'
type OrderType = 'market' | 'limit'

const BUILDER_RATE = BUILDER_FEE / 100000

function fmtPrice(p: number) {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (p >= 1) return p.toFixed(2)
  return p.toFixed(5)
}

export function TradePanel({ coin, markPrice, assetIndex, maxLeverage, baseTakerFee = 0.00045, baseMakerFee = 0.00015, onOrderPlaced }: TradePanelProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { availableBalance, refresh } = useAccount_HL()
  const { state, error, isNew, isApproved, ensureApproved, reset } = useOnboarding()

  const [side, setSide] = useState<Side>('long')
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [sizeUsd, setSizeUsd] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [leverage, setLeverage] = useState(10)
  const [placing, setPlacing] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const isLong = side === 'long'
  const takerFeeStr = ((baseTakerFee + BUILDER_RATE) * 100).toFixed(4) + '%'
  const makerFeeStr = ((baseMakerFee + BUILDER_RATE) * 100).toFixed(4) + '%'
  const clampedLeverage = Math.min(Math.max(leverage, 1), maxLeverage)

  const orderValue = useMemo(() => (parseFloat(sizeUsd) || 0) * clampedLeverage, [sizeUsd, clampedLeverage])

  const sizeCoin = useMemo(() => {
    const usd = parseFloat(sizeUsd) || 0
    const px = orderType === 'limit' ? parseFloat(limitPrice) || markPrice : markPrice
    return px === 0 ? 0 : (usd * clampedLeverage) / px
  }, [sizeUsd, clampedLeverage, limitPrice, markPrice, orderType])

  const liqPrice = useMemo(() => {
    if (!sizeCoin || !markPrice) return null
    const liqPct = (1 / clampedLeverage) * 0.9
    return isLong ? markPrice * (1 - liqPct) : markPrice * (1 + liqPct)
  }, [sizeCoin, markPrice, clampedLeverage, isLong])

  const margin = useMemo(() => (parseFloat(sizeUsd) || 0), [sizeUsd])

  async function placeOrder() {
    if (!walletClient || !isConnected || !address) return
    if (!sizeUsd || parseFloat(sizeUsd) <= 0) {
      setStatus({ type: 'error', msg: 'Enter a valid size' })
      return
    }
    if (!isApproved(address)) {
      const approved = await ensureApproved(address)
      if (!approved) return
    }
    setPlacing(true)
    setStatus(null)
    try {
      const px = orderType === 'limit' ? parseFloat(limitPrice) : undefined
      const { action, nonce, signature } = await signOrder(walletClient, { coin, isBuy: isLong, sz: sizeCoin, px })
      const actionWithAsset = {
        ...action,
        orders: [{ ...(action as { orders: { a: number }[] }).orders[0], a: assetIndex }],
      }
      const result = await postExchange(actionWithAsset, nonce, signature)
      if (result?.status === 'ok') {
        setStatus({ type: 'success', msg: `${isLong ? 'Long' : 'Short'} order placed!` })
        setSizeUsd('')
        onOrderPlaced?.()
        setTimeout(refresh, 1000)
      } else {
        throw new Error(result?.response?.data?.statuses?.[0] || 'Order failed')
      }
    } catch (e: unknown) {
      setStatus({ type: 'error', msg: e instanceof Error ? e.message : 'Order failed' })
    } finally {
      setPlacing(false)
    }
  }

  return (
    <>
      <OnboardingModal state={state} isNew={isNew} error={error} onClose={reset} />

      <div className="flex flex-col h-full overflow-y-auto">
        {/* Long / Short tabs */}
        <div className="grid grid-cols-2 border-b border-border-primary flex-shrink-0">
          <button
            onClick={() => setSide('long')}
            className={`py-2.5 text-sm font-semibold transition-colors ${
              isLong ? 'bg-long/10 text-long border-b-2 border-long' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
            }`}
          >
            Long
          </button>
          <button
            onClick={() => setSide('short')}
            className={`py-2.5 text-sm font-semibold transition-colors ${
              !isLong ? 'bg-short/10 text-short border-b-2 border-short' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
            }`}
          >
            Short
          </button>
        </div>

        <div className="flex flex-col gap-3 p-3">
          {/* Order type */}
          <div className="flex gap-1 bg-bg-tertiary rounded-lg p-0.5">
            {(['market', 'limit'] as OrderType[]).map(t => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`flex-1 py-1.5 text-xs rounded-md capitalize font-medium transition-colors ${
                  orderType === t
                    ? 'bg-bg-secondary text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Available balance */}
          {isConnected && availableBalance > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Available</span>
              <span className="text-text-secondary font-mono">${availableBalance.toFixed(2)} USDC</span>
            </div>
          )}

          {/* Limit price */}
          {orderType === 'limit' && (
            <div>
              <label className="text-2xs text-text-muted block mb-1.5">Price (USD)</label>
              <input
                type="number"
                value={limitPrice}
                onChange={e => setLimitPrice(e.target.value)}
                placeholder={markPrice > 0 ? fmtPrice(markPrice) : '0.00'}
                className="w-full bg-bg-tertiary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-secondary"
              />
            </div>
          )}

          {/* Size */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-2xs text-text-muted">Size (USD)</label>
              {availableBalance > 0 && (
                <button
                  onClick={() => setSizeUsd((availableBalance * 0.95).toFixed(2))}
                  className="text-2xs text-accent-blue hover:text-blue-400"
                >
                  Max
                </button>
              )}
            </div>
            <input
              type="number"
              value={sizeUsd}
              onChange={e => setSizeUsd(e.target.value)}
              placeholder="0.00"
              className="w-full bg-bg-tertiary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-secondary"
            />
            {sizeCoin > 0 && (
              <p className="text-2xs text-text-muted mt-1">≈ {sizeCoin.toFixed(4)} {coin}</p>
            )}
          </div>

          {/* Leverage slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-2xs text-text-muted">Leverage</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={maxLeverage}
                  value={leverage}
                  onChange={e => setLeverage(Math.min(maxLeverage, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-12 bg-bg-tertiary border border-border-primary rounded px-1.5 py-0.5 text-xs text-text-primary font-mono text-center focus:outline-none focus:border-border-secondary"
                />
                <span className="text-xs text-text-muted">x</span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={maxLeverage}
              value={leverage}
              onChange={e => setLeverage(parseInt(e.target.value))}
              className="w-full h-1 accent-accent-blue cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              {[1, 25, 50, 75, 100].map(pct => {
                const val = Math.max(1, Math.round((pct / 100) * maxLeverage))
                return (
                  <button
                    key={pct}
                    onClick={() => setLeverage(val)}
                    className="text-2xs text-text-muted hover:text-text-secondary"
                  >
                    {pct}%
                  </button>
                )
              })}
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-bg-tertiary rounded-lg p-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Order value</span>
              <span className="text-text-primary font-mono">${orderValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Margin</span>
              <span className="text-text-primary font-mono">${margin.toFixed(2)}</span>
            </div>
            {liqPrice && (
              <div className="flex justify-between">
                <span className="text-text-muted">Est. liq. price</span>
                <span className="text-short font-mono">${fmtPrice(liqPrice)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border-primary pt-1.5">
              <span className="text-text-muted">Fees</span>
              <span className="text-text-secondary font-mono">{takerFeeStr} / {makerFeeStr}</span>
            </div>
          </div>

          {/* Status */}
          {status && (
            <div className={`text-xs px-3 py-2 rounded-lg ${
              status.type === 'success' ? 'bg-long-bg text-long' : 'bg-short-bg text-short'
            }`}>
              {status.msg}
            </div>
          )}

          {/* Submit */}
          {isConnected ? (
            <button
              onClick={placeOrder}
              disabled={placing || !sizeUsd}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isLong ? 'bg-long hover:bg-long-dim' : 'bg-short hover:bg-short-dim'
              }`}
            >
              {placing ? 'Placing...' : `${isLong ? 'Buy / Long' : 'Sell / Short'} ${coin}`}
            </button>
          ) : (
            <button className="w-full py-2.5 rounded-lg text-sm font-semibold text-text-muted border border-border-primary cursor-default">
              Connect wallet to trade
            </button>
          )}
        </div>
      </div>
    </>
  )
}
