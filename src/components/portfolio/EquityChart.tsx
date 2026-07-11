'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import { getPortfolio, type PortfolioPeriod } from '@/lib/hyperliquid'

const PERIODS: { key: PortfolioPeriod; label: string }[] = [
  { key: 'day', label: '1D' },
  { key: 'week', label: '1W' },
  { key: 'month', label: '1M' },
  { key: 'allTime', label: 'All' },
]

const ACCENT = '#1EBCAD'

interface EquityChartProps {
  address: string
}

export function EquityChart({ address }: EquityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const [period, setPeriod] = useState<PortfolioPeriod>('week')
  const [loading, setLoading] = useState(true)
  const [empty, setEmpty] = useState(false)

  // Create the chart once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#7d8a8c', fontSize: 11, attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      rightPriceScale: { borderColor: '#1f2628' },
      timeScale: { borderColor: '#1f2628', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      autoSize: true,
    })

    const series = chart.addAreaSeries({
      lineColor: ACCENT,
      topColor: 'rgba(30,188,173,0.28)',
      bottomColor: 'rgba(30,188,173,0.02)',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (p: number) => `$${p.toFixed(2)}` },
    })

    chartRef.current = chart
    seriesRef.current = series

    return () => { chart.remove(); chartRef.current = null }
  }, [])

  // Load history whenever address/period changes
  useEffect(() => {
    if (!seriesRef.current || !address) return
    let cancelled = false
    setLoading(true)
    setEmpty(false)

    getPortfolio(address).then(data => {
      if (cancelled || !seriesRef.current) return
      const entry = data.find(([p]) => p === period)?.[1]
      const history = entry?.accountValueHistory || []
      if (history.length === 0) {
        setEmpty(true)
        seriesRef.current.setData([])
        return
      }
      seriesRef.current.setData(history.map(([t, v]) => ({
        time: Math.floor(t / 1000) as UTCTimestamp,
        value: parseFloat(v),
      })))
      chartRef.current?.timeScale().fitContent()
    }).catch(() => {
      if (!cancelled) setEmpty(true)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [address, period])

  return (
    <div className="flex flex-col bg-bg-secondary border border-border-primary rounded-lg overflow-hidden">
      {/* Period tabs */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border-primary">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              period === p.key ? 'bg-bg-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chart canvas */}
      <div className="relative h-64">
        <div ref={containerRef} className="absolute inset-0" />
        {(loading || empty) && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-text-muted pointer-events-none">
            {loading ? '' : 'No history for this period'}
          </div>
        )}
      </div>
    </div>
  )
}
