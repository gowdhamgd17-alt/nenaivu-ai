import type { Commitment, DueBucket, ISODate } from '@/types/models'

/** Local calendar date as YYYY-MM-DD. */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(value: ISODate, days: number): ISODate {
  const date = parseISODate(value)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function daysBetween(from: ISODate, to: ISODate): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime()
  return Math.round(ms / 86_400_000)
}

/* Display formatting lives in src/i18n/translate.ts (locale-aware). */

export function dueBucket(c: Pick<Commitment, 'dueDate'>, today: ISODate = todayISO()): DueBucket {
  if (!c.dueDate) return 'undated'
  if (c.dueDate < today) return 'overdue'
  if (c.dueDate === today) return 'today'
  return 'upcoming'
}

/** ISO timestamp n days (and optional hours) before now. Used by mock seed data. */
export function timestampDaysAgo(days: number, hours = 0) {
  return new Date(Date.now() - (days * 24 + hours) * 3_600_000).toISOString()
}
