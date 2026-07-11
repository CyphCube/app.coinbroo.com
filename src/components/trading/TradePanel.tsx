'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { postExchange } from '@/lib/hyperliquid'
import { signOrder } from '@/lib/signing'
import { useAccount_HL } from '@/hooks/useAccountHL'
import { useOnboarding } from '@/hooks/useOnboarding'
import { OnboardingModal } from '@/components/ui/OnboardingModal'
import { BUILDER_FEE } from '@/lib/hyperliquid'
import { useTranslation } from '@/hooks/useTranslation'

interface TradePanelProps {
  coin: string
  markPrice: number
  assetIndex: number
  maxLeverage: number
  baseTakerFee?: number
  baseMakerFee?: number
  isSpot?: boolean
  szDecimals?: number
  baseToken?: string
  onOrderPlaced?: () => void
  priceClick?: { px: number; n: number } | null
}

type OrderType = 'market' | 'limit' | 'stopLimit' | 'stopMarket' | 'takeLimit' | 'takeMarket'

const isTriggerType = (ot: OrderType) => ot.startsWith('stop') || ot.startsWith('take')
const needsLimitPx = (ot: OrderType) => ot === 'limit' || ot === 'stopLimit' || ot === 'takeLimit'

const BUILDER_RATE = BUILDER_FEE / 100000

function fmtPrice(p: number) {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (p >= 1) return p.toFixed(2)
  return p.toFixed(5)
}

export function TradePanel({ coin, markPrice, assetIndex, maxLeverage, baseTakerFee = 0.00045, baseMakerFee = 0.00015, isSpot = false, szDecimals = 4, baseToken, onOrderPlaced, priceClick }: TradePanelProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { availableBalance, positions, spotBalances, refresh } = useAccount_HL()
  const { state, error, isNew, isApproved, ensureApproved, reset } = useOnboarding()
  const { t } = useTranslation()

  const PRO_TYPES: { key: OrderType; label: string }[] = [
    { key: 'stopLimit', label: t('tradePanel.stopLimit') },
    { key: 'stopMarket', label: t('tradePanel.stopMarket') },
    { key: 'takeLimit', label: t('tradePanel.takeLimit') },
    { key: 'takeMarket', label: t('tradePanel.takeMarket') },
  ]
  const PRO_LABEL: Record<string, string> = Object.fromEntries(PRO_TYPES.map(p => [p.key, p.label]))

  const [isBuy, setIsBuy] = useState(true)
  const [orderType, setOrderType] = useState<OrderType>('limit')
  const [showProMenu, setShowProMenu] = useState(false)
  const [sizeUsd, setSizeUsd] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [triggerPrice, setTriggerPrice] = useState('')
  const [leverage, setLeverage] = useState(10)
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('cross')
  const [reduceOnly, setReduceOnly] = useState(false)
  const [sizePct, setSizePct] = useState(0)
  const [showLevPicker, setShowLevPicker] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Fill the limit price when the user clicks an order-book row (Hyperliquid UX).
  // Switch to a limit-style order if the current type has no price field.
  useEffect(() => {
    if (!priceClick) return
    setLimitPrice(String(priceClick.px))
    setOrderType(t => (needsLimitPx(t) ? t : 'limit'))
  }, [priceClick])

  const clampedLev = isSpot ? 1 : Math.min(Math.max(leverage, 1), maxLeverage)
  const takerFeeStr = ((baseTakerFee + BUILDER_RATE) * 100).toFixed(4) + '%'
  const makerFeeStr = ((baseMakerFee + BUILDER_RATE) * 100).toFixed(4) + '%'

  const currentPosition = positions.find(p => p.coin === coin)
  const positionSize = currentPosition ? parseFloat(currentPosition.szi) : 0

  // Balances
  const usdcSpot = spotBalances['USDC'] || 0
  const baseBal = baseToken ? (spotBalances[baseToken] || 0) : 0

  // Available to trade (in USD terms) for the current side
  const availableUsd = isSpot
    ? (isBuy ? usdcSpot : baseBal * markPrice)
    : availableBalance

  const margin = parseFloat(sizeUsd) || 0
  const orderValue = isSpot ? margin : margin * clampedLev

  const sizeCoin = useMemo(() => {
    let px = markPrice
    if (needsLimitPx(orderType)) px = parseFloat(limitPrice) || markPrice
    else if (isTriggerType(orderType)) px = parseFloat(triggerPrice) || markPrice
    return px === 0 ? 0 : orderValue / px
  }, [orderValue, limitPrice, triggerPrice, markPrice, orderType])

  const liqPrice = useMemo(() => {
    if (isSpot || !sizeCoin || !markPrice) return null
    const liqPct = (1 / clampedLev) * 0.9
    return isBuy ? markPrice * (1 - liqPct) : markPrice * (1 + liqPct)
  }, [isSpot, sizeCoin, markPrice, clampedLev, isBuy])

  function applyPct(pct: number) {
    setSizePct(pct)
    if (availableUsd > 0) setSizeUsd(((availableUsd * pct) / 100).toFixed(2))
  }

  function setMid() {
    if (markPrice > 0) setLimitPrice(fmtPrice(markPrice))
  }

  async function placeOrder() {
    if (!walletClient || !isConnected || !address) return
    if (!sizeUsd || parseFloat(sizeUsd) <= 0) {
      setStatus({ type: 'error', msg: t('tradePanel.enterValidSize') })
      return
    }
    if (needsLimitPx(orderType) && !(parseFloat(limitPrice) > 0)) {
      setStatus({ type: 'error', msg: t('tradePanel.enterLimitPrice') })
      return
    }
    if (isTriggerType(orderType) && !(parseFloat(triggerPrice) > 0)) {
      setStatus({ type: 'error', msg: t('tradePanel.enterTriggerPrice') })
      return
    }
    if (!isApproved(address)) {
      const approved = await ensureApproved(address)
      if (!approved) return
    }
    setPlacing(true)
    setStatus(null)
    try {
      const px = needsLimitPx(orderType) ? parseFloat(limitPrice) : undefined
      const trigger = isTriggerType(orderType)
        ? {
            triggerPx: parseFloat(triggerPrice),
            isMarket: !needsLimitPx(orderType),
            tpsl: (orderType.startsWith('take') ? 'tp' : 'sl') as 'tp' | 'sl',
          }
        : undefined
      const { action, nonce, signature } = await signOrder(walletClient, {
        coin,
        isBuy,
        sz: sizeCoin,
        px,
        markPx: markPrice,
        szDecimals,
        isSpot,
        reduceOnly: isSpot ? false : reduceOnly,
        trigger,
      })
      const actionWithAsset = {
        ...action,
        orders: [{ ...(action as { orders: { a: number }[] }).orders[0], a: assetIndex }],
      }
      const result = await postExchange(actionWithAsset, nonce, signature)
      if (result?.status === 'ok') {
        const statuses = result?.response?.data?.statuses
        const err = statuses?.find?.((s: unknown) => typeof s === 'object' && s && 'error' in s) as { error?: string } | undefined
        if (err?.error) throw new Error(err.error)
        setStatus({ type: 'success', msg: isBuy ? t('tradePanel.buyOrderPlaced') : t('tradePanel.sellOrderPlaced') })
        setSizeUsd(''); setSizePct(0)
        onOrderPlaced?.()
        setTimeout(refresh, 1000)
      } else {
        throw new Error(result?.response?.data?.statuses?.[0] || result?.response || t('tradePanel.orderFailed'))
      }
    } catch (e: unknown) {
      setStatus({ type: 'error', msg: e instanceof Error ? e.message : t('tradePanel.orderFailed') })
    } finally {
      setPlacing(false)
    }
  }

  const buyLabel = isSpot ? t('tradePanel.buy') : t('tradePanel.buyLong')
  const sellLabel = isSpot ? t('tradePanel.sell') : t('tradePanel.sellShort')

  return (
    <>
      <OnboardingModal state={state} isNew={isNew} error={error} onClose={reset} />

      <div className="flex flex-col h-full overflow-y-auto">
        {/* Margin mode / leverage / mode row — perps only */}
        {!isSpot && (
          <div className="flex items-center gap-1.5 p-2 border-b border-border-primary flex-shrink-0">
            <button
              onClick={() => setMarginMode(m => m === 'cross' ? 'isolated' : 'cross')}
              className="flex-1 py-1.5 text-2xs font-semibold rounded bg-bg-tertiary text-text-secondary hover:bg-bg-hover transition-colors"
            >
              {marginMode === 'cross' ? t('tradePanel.cross') : t('tradePanel.isolated')}
            </button>
            <button
              onClick={() => setShowLevPicker(v => !v)}
              className="flex-1 py-1.5 text-2xs font-semibold rounded bg-bg-tertiary text-accent-blue hover:bg-bg-hover transition-colors"
            >
              {clampedLev}x
            </button>
            <span className="flex-1 py-1.5 text-2xs font-semibold rounded bg-bg-tertiary text-text-muted text-center">
              {t('tradePanel.unified')}
            </span>
          </div>
        )}

        {!isSpot && showLevPicker && (
          <div className="px-3 py-2.5 border-b border-border-primary flex-shrink-0">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-2xs text-text-muted">{t('tradePanel.leverage')}</span>
              <span className="text-xs font-medium text-text-primary">{clampedLev}x</span>
            </div>
            <input
              type="range" min={1} max={maxLeverage} value={leverage}
              onChange={e => setLeverage(parseInt(e.target.value))}
              className="w-full h-1 accent-accent-blue cursor-pointer"
            />
            <div className="flex justify-between mt-1 text-2xs text-text-muted">
              <span>1x</span><span>{maxLeverage}x</span>
            </div>
          </div>
        )}

        {/* Order type tabs */}
        <div className="flex items-center justify-between border-b border-border-primary flex-shrink-0 relative px-1">
          {(['market', 'limit'] as OrderType[]).map(ot => (
            <button
              key={ot}
              onClick={() => { setOrderType(ot); setShowProMenu(false) }}
              className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                orderType === ot ? 'text-text-primary border-b-2 border-accent-blue -mb-px' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {ot === 'market' ? t('tradePanel.market') : t('tradePanel.limit')}
            </button>
          ))}
          {/* Pro (trigger orders) */}
          <button
            onClick={() => setShowProMenu(v => !v)}
            className={`px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1 ${
              isTriggerType(orderType) ? 'text-text-primary border-b-2 border-accent-blue -mb-px' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {isTriggerType(orderType) ? PRO_LABEL[orderType] : t('tradePanel.pro')}
            <svg className={`w-3 h-3 transition-transform ${showProMenu ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {isSpot && <span className="ml-auto pr-3 text-2xs text-accent-blue self-center">{t('tradePanel.spot')}</span>}

          {showProMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowProMenu(false)} />
              <div className="absolute right-0 top-full z-30 mt-px w-40 bg-bg-secondary border border-border-primary rounded-md shadow-xl py-1">
                {PRO_TYPES.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setOrderType(p.key); setShowProMenu(false) }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      orderType === p.key ? 'text-accent-blue' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2.5 p-3">
          {/* Buy / Sell */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { setIsBuy(true); setSizePct(0) }}
              className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                isBuy ? 'bg-long text-bg-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {buyLabel}
            </button>
            <button
              onClick={() => { setIsBuy(false); setSizePct(0) }}
              className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                !isBuy ? 'bg-short text-bg-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {sellLabel}
            </button>
          </div>

          {/* Available / position */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">{t('tradePanel.availableToTrade')}</span>
              {isSpot ? (
                <span className="text-text-primary font-mono tabular-nums">
                  {isBuy ? `${usdcSpot.toFixed(2)} USDC` : `${baseBal.toFixed(4)} ${baseToken}`}
                </span>
              ) : (
                <span className="text-text-primary font-mono tabular-nums">{availableBalance.toFixed(2)} USDC</span>
              )}
            </div>
            {!isSpot && (
              <div className="flex justify-between">
                <span className="text-text-muted">{t('tradePanel.currentPosition')}</span>
                <span className="text-text-primary font-mono tabular-nums">{Math.abs(positionSize).toFixed(4)} {coin}</span>
              </div>
            )}
          </div>

          {/* Trigger price (Stop/Take orders) */}
          {isTriggerType(orderType) && (
            <div className="relative">
              <label className="text-2xs text-text-muted block mb-1">{t('tradePanel.triggerPrice')}</label>
              <input
                type="number"
                value={triggerPrice}
                onChange={e => setTriggerPrice(e.target.value)}
                placeholder={markPrice > 0 ? fmtPrice(markPrice) : '0.00'}
                className="w-full bg-bg-tertiary border border-border-primary rounded-md px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-secondary"
              />
              <button
                onClick={() => { if (markPrice > 0) setTriggerPrice(fmtPrice(markPrice)) }}
                className="absolute right-2 top-[26px] text-2xs text-accent-blue hover:text-accent-blue-dim font-medium"
              >
                {t('tradePanel.mid')}
              </button>
            </div>
          )}

          {/* Limit price (Limit + Stop/Take Limit) */}
          {needsLimitPx(orderType) && (
            <div className="relative">
              <label className="text-2xs text-text-muted block mb-1">{t('tradePanel.price')}</label>
              <input
                type="number"
                value={limitPrice}
                onChange={e => setLimitPrice(e.target.value)}
                placeholder={markPrice > 0 ? fmtPrice(markPrice) : '0.00'}
                className="w-full bg-bg-tertiary border border-border-primary rounded-md px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-secondary"
              />
              <button
                onClick={setMid}
                className="absolute right-2 top-[26px] text-2xs text-accent-blue hover:text-accent-blue-dim font-medium"
              >
                {t('tradePanel.mid')}
              </button>
            </div>
          )}

          {/* Size */}
          <div>
            <label className="text-2xs text-text-muted block mb-1">{t('tradePanel.size')} (USD)</label>
            <input
              type="number"
              value={sizeUsd}
              onChange={e => { setSizeUsd(e.target.value); setSizePct(0) }}
              placeholder="0.00"
              className="w-full bg-bg-tertiary border border-border-primary rounded-md px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-secondary"
            />
            {sizeCoin > 0 && (
              <p className="text-2xs text-text-muted mt-1">≈ {sizeCoin.toFixed(4)} {isSpot ? baseToken : coin}</p>
            )}
          </div>

          {/* Size % slider */}
          <div>
            <input
              type="range" min={0} max={100} step={1} value={sizePct}
              onChange={e => applyPct(parseInt(e.target.value))}
              className="w-full h-1 accent-accent-blue cursor-pointer"
            />
            <div className="flex justify-between mt-1.5">
              {[0, 25, 50, 75, 100].map(p => (
                <button key={p} onClick={() => applyPct(p)} className="text-2xs text-text-muted hover:text-text-secondary">
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Reduce only — perps only */}
          {!isSpot && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reduceOnly}
                onChange={e => setReduceOnly(e.target.checked)}
                className="w-3.5 h-3.5 accent-accent-blue"
              />
              <span className="text-xs text-text-secondary">{t('tradePanel.reduceOnly')}</span>
            </label>
          )}

          {/* Status */}
          {status && (
            <div className={`text-xs px-3 py-2 rounded-md break-words ${status.type === 'success' ? 'bg-long-bg text-long' : 'bg-short-bg text-short'}`}>
              {status.msg}
            </div>
          )}

          {/* Submit */}
          {isConnected ? (
            <button
              onClick={placeOrder}
              disabled={placing || !sizeUsd || (needsLimitPx(orderType) && !limitPrice) || (isTriggerType(orderType) && !triggerPrice)}
              className={`w-full py-2.5 rounded-md text-sm font-semibold text-bg-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isBuy ? 'bg-long hover:bg-long-dim' : 'bg-short hover:bg-short-dim'
              }`}
            >
              {placing ? t('tradePanel.placing') : `${isBuy ? buyLabel : sellLabel} ${isSpot ? baseToken : coin}`}
            </button>
          ) : (
            <button className="w-full py-2.5 rounded-md text-sm font-semibold text-bg-primary bg-accent-blue cursor-default">
              {t('tradePanel.connectToTrade')}
            </button>
          )}

          {/* Footer details */}
          <div className="space-y-1.5 text-xs pt-1 border-t border-border-primary">
            {!isSpot && (
              <div className="flex justify-between">
                <span className="text-text-muted">{t('tradePanel.liquidationPrice')}</span>
                <span className="font-mono text-text-secondary tabular-nums">{liqPrice ? `$${fmtPrice(liqPrice)}` : 'N/A'}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-muted">{t('tradePanel.orderValue')}</span>
              <span className="font-mono text-text-secondary tabular-nums">{orderValue > 0 ? `$${orderValue.toFixed(2)}` : 'N/A'}</span>
            </div>
            {!isSpot && (
              <div className="flex justify-between">
                <span className="text-text-muted">{t('tradePanel.marginRequired')}</span>
                <span className="font-mono text-text-secondary tabular-nums">{margin > 0 ? `$${margin.toFixed(2)}` : 'N/A'}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-muted">{t('tradePanel.fees')}</span>
              <span className="font-mono text-text-secondary tabular-nums">{takerFeeStr} / {makerFeeStr}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
