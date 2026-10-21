/**
 * Pure translation and formatting functions (no React), so they can be unit-tested
 * and reused outside components.
 */
import { addDays, daysBetween, parseISODate, todayISO } from '@/lib/dates'
import type { ISODate } from '@/types/models'
import { LANGS, type Lang } from './config'
import { en, type MessageKey, type Messages } from './messages/en'
import { ta } from './messages/ta'

const DICTIONARIES: Record<Lang, Messages> = { en, ta }

/** Keys usable with `t()`: concrete keys plus plural bases (`foo` for `foo_one`/`foo_other`). */
type PluralBase<K> = K extends `${infer B}_other` ? B : never
export type TKey = MessageKey | PluralBase<MessageKey>
export type TParams = Record<string, string | number>
export type Translate = (key: TKey, params?: TParams) => string

function interpolate(template: string, params?: TParams) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

export function createTranslator(lang: Lang): Translate {
  const dict = DICTIONARIES[lang]
  const plural = new Intl.PluralRules(LANGS[lang].locale)
  const number = new Intl.NumberFormat(LANGS[lang].locale)
  return (key, params) => {
    let template: string | undefined = dict[key as MessageKey]
    let resolvedParams = params
    if (template === undefined && params && typeof params.count === 'number') {
      const rule = plural.select(params.count)
      template = dict[`${key}_${rule}` as MessageKey] ?? dict[`${key}_other` as MessageKey]
      resolvedParams = { ...params, count: number.format(params.count) }
    }
    if (template === undefined) {
      // Fall back to English, then to the key itself, so a gap is visible but never crashes.
      template = en[key as MessageKey] ?? (key as string)
    }
    return interpolate(template, resolvedParams)
  }
}

// ── Locale-aware formatting ─────────────────────────────────────────────────

export function createFormatter(lang: Lang, t: Translate) {
  const locale = LANGS[lang].locale
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const shortFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
  const longFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const dateTimeFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  const relFmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const numFmt = new Intl.NumberFormat(locale)
  const listFmt = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' })
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long' })

  const date = (value: ISODate, opts: { short?: boolean } = {}) => {
    const d = parseISODate(value)
    return opts.short || d.getFullYear() === new Date().getFullYear() ? shortFmt.format(d) : dateFmt.format(d)
  }

  return {
    locale,
    number: (n: number) => numFmt.format(n),
    list: (items: string[]) => listFmt.format(items),
    date,
    longDate: (d: Date) => longFmt.format(d),
    dateTime: (iso: string) => dateTimeFmt.format(new Date(iso)),
    /** Weekday name for 0 = Monday … 6 = Sunday. */
    weekday: (index: number) => {
      // 2024-01-01 was a Monday.
      return weekdayFmt.format(parseISODate(addDays('2024-01-01', index)))
    },
    relative: (iso: string) => {
      const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
      if (diffMin < 1) return t('time.justNow')
      if (diffMin < 60) return relFmt.format(-diffMin, 'minute')
      const hours = Math.round(diffMin / 60)
      if (hours < 24) return relFmt.format(-hours, 'hour')
      const days = Math.round(hours / 24)
      if (days < 7) return relFmt.format(-days, 'day')
      return dateTimeFmt.format(new Date(iso))
    },
    /** "Due today", "3 days overdue", "Due in 2 days", "Due 4 Nov". */
    due: (dueDate: ISODate, today: ISODate = todayISO()) => {
      const diff = daysBetween(today, dueDate)
      if (diff === 0) return t('due.today')
      if (diff === 1) return t('due.tomorrow')
      if (diff < 0) return t('due.overdue', { count: Math.abs(diff) })
      if (diff < 7) return t('due.inDays', { count: diff })
      return t('due.on', { date: date(dueDate) })
    },
  }
}

export type Formatter = ReturnType<typeof createFormatter>
