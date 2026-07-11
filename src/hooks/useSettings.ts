'use client'

import { useCallback, useEffect, useState } from 'react'

export type NumberFormat = '1,234.56' | '1.234,56' | '1234,56' | '1 234,56'
export type Language = 'English' | 'Français' | '简体中文' | '한국어' | 'Español'

export interface Settings {
  numberFormat: NumberFormat
  language: Language
  persistTradingConnection: boolean
  skipOpenOrderConfirmation: boolean
  skipClosePositionConfirmation: boolean
  holdToCloseAllPositions: boolean
  showBuysAndSellsOnChart: boolean
  setOrderBookSizeOnClick: boolean
  animateOrderBook: boolean
  disableBackgroundFillNotifications: boolean
  disablePlayingSoundForFills: boolean
  hidePnl: boolean
  showAllWarnings: boolean
  disableTransactionDelayProtection: boolean
  displayVerboseErrors: boolean
  optOutOfSpotDusting: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  numberFormat: '1,234.56',
  language: 'English',
  persistTradingConnection: false,
  skipOpenOrderConfirmation: false,
  skipClosePositionConfirmation: false,
  holdToCloseAllPositions: false,
  showBuysAndSellsOnChart: true,
  setOrderBookSizeOnClick: true,
  animateOrderBook: true,
  disableBackgroundFillNotifications: false,
  disablePlayingSoundForFills: true,
  hidePnl: false,
  showAllWarnings: true,
  disableTransactionDelayProtection: false,
  displayVerboseErrors: false,
  optOutOfSpotDusting: false,
}

const STORAGE_KEY = 'cb:settings'
const EVENT_NAME = 'cb:settings-changed'

function load(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function persist(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

/**
 * App-wide settings, persisted to localStorage and synced across every
 * component using this hook. SSR-safe: renders defaults on the server/first
 * paint, then corrects after mount (same pattern as useMediaQuery).
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    setSettings(load())
    const onChange = () => setSettings(load())
    window.addEventListener(EVENT_NAME, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(EVENT_NAME, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...load(), [key]: value }
    persist(next)
    setSettings(next)
  }, [])

  const reset = useCallback(() => {
    persist(DEFAULT_SETTINGS)
    setSettings(DEFAULT_SETTINGS)
  }, [])

  return { settings, update, reset }
}
