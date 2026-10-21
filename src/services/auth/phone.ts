/**
 * Indian mobile numbers: 10 digits starting with 6, 7, 8 or 9.
 * Accepts what people actually type: spaces, dashes, a leading 0, or +91 / 91.
 */
export type PhoneError = 'empty' | 'length' | 'prefix'

export function normaliseIndianMobile(input: string): { ok: true; e164: string; national: string } | { ok: false; error: PhoneError } {
  let digits = input.replace(/\D/g, '')
  if (!digits) return { ok: false, error: 'empty' }
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length !== 10) return { ok: false, error: 'length' }
  if (!/^[6-9]/.test(digits)) return { ok: false, error: 'prefix' }
  return { ok: true, e164: `+91${digits}`, national: digits }
}

/** "+91 98765 43210" */
export function formatIndianMobile(e164: string) {
  const d = e164.replace(/^\+91/, '')
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`
}

/** "+91 98••• ••210" — shown in menus so the full number is not on screen. */
export function maskIndianMobile(e164: string) {
  const d = e164.replace(/^\+91/, '')
  return `+91 ${d.slice(0, 2)}••• ••${d.slice(7)}`
}
