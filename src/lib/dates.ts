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

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDate(value: ISODate, opts: { short?: boolean } = {}) {
  const date = parseISODate(value)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return opts.short || sameYear ? shortFmt.format(date) : dateFmt.format(date)
}

export function formatDateTime(value: string) {
  return dateTimeFmt.format(new Date(value))
}

/** Human description of a due date relative to today, e.g. "Due tomorrow", "3 days overdue". */
export function describeDue(dueDate: ISODate, today: ISODate = todayISO()) {
  const diff = daysBetween(today, dueDate)
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff === -1) return '1 day overdue'
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  if (diff < 7) return `Due in ${diff} days`
  return `Due ${formatDate(dueDate)}`
}

export function dueBucket(c: Pick<Commitment, 'dueDate'>, today: ISODate = todayISO()): DueBucket {
  if (!c.dueDate) return 'undated'
  if (c.dueDate < today) return 'overdue'
  if (c.dueDate === today) return 'today'
  return 'upcoming'
}

export function relativeTime(value: string) {
  const diffMin = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const hours = Math.round(diffMin / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} d ago`
  return formatDateTime(value)
}

/** ISO timestamp n days (and optional hours) before now. Used by mock seed data. */
export function timestampDaysAgo(days: number, hours = 0) {
  return new Date(Date.now() - (days * 24 + hours) * 3_600_000).toISOString()
}
