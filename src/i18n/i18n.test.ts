import { describe, expect, it } from 'vitest'
import { addDays, todayISO } from '@/lib/dates'
import { en } from './messages/en'
import { ta } from './messages/ta'
import { createFormatter, createTranslator } from './translate'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const tags = (s: string) => [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort()

describe('dictionaries', () => {
  it('Tamil has exactly the English keys', () => {
    expect(Object.keys(ta).sort()).toEqual(Object.keys(en).sort())
  })

  it('no translation is empty', () => {
    for (const [key, value] of Object.entries(ta)) expect(value.trim(), key).not.toBe('')
  })

  it('Tamil keeps every placeholder and inline tag of the English source', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(ta[key]), key).toEqual(placeholders(en[key]))
      expect(tags(ta[key]), key).toEqual(tags(en[key]))
    }
  })

  it('Tamil strings are actually in Tamil (except intentional brand/format strings)', () => {
    const allowedLatin = new Set(['common.listSeparator', 'capture.shortcut', 'dashboard.welcome', 'dashboard.welcomeNoName'])
    for (const [key, value] of Object.entries(ta)) {
      if (allowedLatin.has(key)) continue
      expect(/[஀-௿]/.test(value), key).toBe(true)
    }
  })

  it('product name is not translated', () => {
    expect(ta['nav.ask']).toContain('Nenaivu')
    expect(ta['app.home']).toContain('Nenaivu AI')
  })
})

describe('translator', () => {
  it('interpolates parameters', () => {
    expect(createTranslator('en')('search.noResults', { query: 'teal' })).toBe('No confirmed records match “teal”.')
    expect(createTranslator('ta')('search.noResults', { query: 'teal' })).toContain('“teal”')
  })

  it('selects plural forms per language', () => {
    const t = createTranslator('en')
    expect(t('badge.notes', { count: 1 })).toBe('1 note')
    expect(t('badge.notes', { count: 3 })).toBe('3 notes')
    const tt = createTranslator('ta')
    expect(tt('badge.notes', { count: 1 })).toBe('1 குறிப்பு')
    expect(tt('badge.notes', { count: 3 })).toBe('3 குறிப்புகள்')
  })

  it('switching language changes output without changing the key', () => {
    expect(createTranslator('en')('nav.memory')).toBe('Business Memory')
    expect(createTranslator('ta')('nav.memory')).toBe('வணிக நினைவகம்')
  })
})

describe('formatter', () => {
  const today = todayISO()

  it('describes due dates in each language', () => {
    const fEn = createFormatter('en', createTranslator('en'))
    const fTa = createFormatter('ta', createTranslator('ta'))
    expect(fEn.due(today, today)).toBe('Due today')
    expect(fEn.due(addDays(today, -3), today)).toBe('3 days overdue')
    expect(fTa.due(today, today)).toBe('இன்று கெடு')
    expect(fTa.due(addDays(today, -3), today)).toBe('கெடு 3 நாட்கள் தாண்டியது')
    expect(fTa.due(addDays(today, 2), today)).toBe('2 நாட்களில் கெடு')
  })

  it('formats dates with the Tamil locale', () => {
    const fTa = createFormatter('ta', createTranslator('ta'))
    // Tamil month names use Tamil script.
    expect(fTa.date('2026-10-21')).toMatch(/[஀-௿]/)
    expect(fTa.weekday(4)).toBe('வெள்ளி')
  })
})
