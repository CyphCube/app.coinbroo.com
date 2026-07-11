'use client'

import { useState } from 'react'
import { useSettings, type Settings } from '@/hooks/useSettings'
import { useTranslation } from '@/hooks/useTranslation'

type ToggleKey = Exclude<keyof Settings, 'numberFormat' | 'language'>

function ToggleRow({ label, checked, onChange, dotted }: { label: string; checked: boolean; onChange: (v: boolean) => void; dotted?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 px-3 py-1.5 cursor-pointer hover:bg-bg-hover transition-colors">
      <span className={`text-sm text-text-secondary ${dotted ? 'border-b border-dotted border-border-secondary w-fit' : ''}`}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-accent-blue flex-shrink-0"
      />
    </label>
  )
}

export function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const { settings, update, reset } = useSettings()
  const { t } = useTranslation()

  const toggle = (key: ToggleKey) => (v: boolean) => update(key, v)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Settings"
        className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
          open ? 'border-border-secondary text-text-primary bg-bg-hover' : 'border-border-primary text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-30 w-72 max-h-[80vh] overflow-y-auto bg-bg-secondary border border-border-primary rounded-lg shadow-2xl py-2">
            <ToggleRow dotted label={t('settingsMenu.persistTradingConnection')} checked={settings.persistTradingConnection} onChange={toggle('persistTradingConnection')} />
            <ToggleRow label={t('settingsMenu.skipOpenOrderConfirmation')} checked={settings.skipOpenOrderConfirmation} onChange={toggle('skipOpenOrderConfirmation')} />
            <ToggleRow label={t('settingsMenu.skipClosePositionConfirmation')} checked={settings.skipClosePositionConfirmation} onChange={toggle('skipClosePositionConfirmation')} />
            <ToggleRow label={t('settingsMenu.holdToCloseAllPositions')} checked={settings.holdToCloseAllPositions} onChange={toggle('holdToCloseAllPositions')} />

            <div className="my-1.5 border-t border-border-primary" />

            <ToggleRow label={t('settingsMenu.showBuysAndSellsOnChart')} checked={settings.showBuysAndSellsOnChart} onChange={toggle('showBuysAndSellsOnChart')} />
            <ToggleRow dotted label={t('settingsMenu.setOrderBookSizeOnClick')} checked={settings.setOrderBookSizeOnClick} onChange={toggle('setOrderBookSizeOnClick')} />
            <ToggleRow label={t('settingsMenu.animateOrderBook')} checked={settings.animateOrderBook} onChange={toggle('animateOrderBook')} />
            <ToggleRow label={t('settingsMenu.disableBackgroundFillNotifications')} checked={settings.disableBackgroundFillNotifications} onChange={toggle('disableBackgroundFillNotifications')} />
            <ToggleRow label={t('settingsMenu.disablePlayingSoundForFills')} checked={settings.disablePlayingSoundForFills} onChange={toggle('disablePlayingSoundForFills')} />
            <ToggleRow label={t('settingsMenu.hidePnl')} checked={settings.hidePnl} onChange={toggle('hidePnl')} />
            <ToggleRow label={t('settingsMenu.showAllWarnings')} checked={settings.showAllWarnings} onChange={toggle('showAllWarnings')} />

            <div className="my-1.5 border-t border-border-primary" />

            <ToggleRow label={t('settingsMenu.disableTransactionDelayProtection')} checked={settings.disableTransactionDelayProtection} onChange={toggle('disableTransactionDelayProtection')} />
            <ToggleRow label={t('settingsMenu.displayVerboseErrors')} checked={settings.displayVerboseErrors} onChange={toggle('displayVerboseErrors')} />
            <ToggleRow label={t('settingsMenu.optOutOfSpotDusting')} checked={settings.optOutOfSpotDusting} onChange={toggle('optOutOfSpotDusting')} />

            <div className="my-1.5 border-t border-border-primary" />

            <button
              onClick={reset}
              className="w-full text-left px-3 py-1.5 text-sm text-accent-blue hover:text-accent-blue-dim transition-colors"
            >
              {t('settingsMenu.returnToDefaultLayout')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
