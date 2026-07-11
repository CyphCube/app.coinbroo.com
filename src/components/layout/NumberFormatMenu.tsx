'use client'

import { useState } from 'react'
import { useSettings, type NumberFormat, type Language } from '@/hooks/useSettings'
import { useTranslation } from '@/hooks/useTranslation'

const NUMBER_FORMATS: NumberFormat[] = ['1,234.56', '1.234,56', '1234,56', '1 234,56']
const LANGUAGES: Language[] = ['English', 'Français', '简体中文', '한국어', 'Español']

export function NumberFormatMenu() {
  const [open, setOpen] = useState(false)
  const { settings, update } = useSettings()
  const { t } = useTranslation()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Number formatting and language"
        className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
          open ? 'border-border-secondary text-text-primary bg-bg-hover' : 'border-border-primary text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-30 w-56 bg-bg-secondary border border-border-primary rounded-lg shadow-2xl py-2">
            <div className="px-3 py-1 text-2xs text-text-muted font-medium">{t('numberFormatMenu.numberFormatting')}</div>
            {NUMBER_FORMATS.map(f => (
              <button
                key={f}
                onClick={() => update('numberFormat', f)}
                className={`w-full text-left px-3 py-1.5 text-sm font-mono transition-colors ${
                  settings.numberFormat === f ? 'text-accent-blue' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                {f}
              </button>
            ))}

            <div className="my-1.5 border-t border-border-primary" />

            <div className="px-3 py-1 text-2xs text-text-muted font-medium">{t('numberFormatMenu.language')}</div>
            {LANGUAGES.map(l => (
              <button
                key={l}
                onClick={() => update('language', l)}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                  settings.language === l ? 'text-accent-blue' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                {l}
              </button>
            ))}

            <div className="my-1.5 border-t border-border-primary" />

            <button
              onClick={() => { update('numberFormat', '1,234.56'); update('language', 'English') }}
              className="w-full text-left px-3 py-1.5 text-sm text-accent-blue hover:text-accent-blue-dim transition-colors"
            >
              {t('numberFormatMenu.reset')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
