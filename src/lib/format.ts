/**
 * `cards.description` is repurposed as the card balance (PRODUCT_MANAGEMENT
 * labels it "Card Balance"), e.g. "50", "$50" or "50 USDT".
 * Renders a `$` prefix when the operator typed a bare number, and leaves any
 * already-formatted value untouched.
 */
export function formatBalance(value: string | null | undefined): string | null {
  const text = (value ?? '').trim()
  if (!text) return null

  // Already carries a currency marker: "$50", "€50", "USDT 50", "50 USDT", …
  if (/^[$€£¥]\s?\d/.test(text)) return text
  if (/^[A-Z]{3}\s?\d/i.test(text)) return text
  if (/\d\s?(usd|usdt|eur|gbp)$/i.test(text)) return text

  // Bare number → assume USD.
  if (/^\d/.test(text)) return `$${text}`

  return text
}
