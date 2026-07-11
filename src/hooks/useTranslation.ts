'use client'

import { useSettings } from '@/hooks/useSettings'
import { TRANSLATIONS, type TranslationKey } from '@/lib/translations'

/**
 * Translates static UI chrome (labels, tabs, headers, buttons) based on the
 * user's language setting. Dynamic content (prices, tickers, counts) is
 * concatenated outside t() by the caller — never pass it through here.
 */
export function useTranslation() {
  const { settings } = useSettings()
  function t(key: TranslationKey): string {
    const entry = TRANSLATIONS[key]
    return entry[settings.language] ?? entry.English
  }
  return { t, language: settings.language }
}
