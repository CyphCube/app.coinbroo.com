import type { NumberFormat } from '@/hooks/useSettings'

// Re-punctuate an en-US formatted number string (e.g. "1,234.56") into the
// selected display style. Operates only on the separator characters, so it
// works regardless of the underlying value or however it was formatted.
//
// IMPORTANT: only use this on read-only display text (order book, positions,
// market list, price tickers). Never wrap editable input values that get
// parsed back with parseFloat() — a locale like "1.234,56" would parse wrong.
export function applyNumberFormat(s: string, format: NumberFormat): string {
  if (!s || format === '1,234.56') return s
  const m = s.match(/^(-?)([\d,]+)(\.\d+)?(.*)$/)
  if (!m) return s
  const [, sign, intPart, decPart, suffix] = m
  const digits = intPart.replace(/,/g, '')
  const decimals = decPart ? decPart.slice(1) : ''

  switch (format) {
    case '1.234,56': {
      const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      return sign + grouped + (decimals ? ',' + decimals : '') + suffix
    }
    case '1234,56':
      return sign + digits + (decimals ? ',' + decimals : '') + suffix
    case '1 234,56': {
      const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      return sign + grouped + (decimals ? ',' + decimals : '') + suffix
    }
    default:
      return s
  }
}
