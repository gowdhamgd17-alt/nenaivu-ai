import { describe, expect, it } from 'vitest'
import { buildFixtureData } from '@/test/fixtures'
import { detectTextLanguage, isMostlyTamil } from '@/lib/language'
import { answerQuestion } from './mockAsk'

const seed = buildFixtureData()
const ws = 'ws_meenakshi'
const ctx = {
  memories: seed.memories.filter((m) => m.workspaceId === ws),
  commitments: seed.commitments.filter((c) => c.workspaceId === ws),
  people: seed.people.filter((p) => p.workspaceId === ws),
}

describe('language detection (typed text)', () => {
  it('detects Tamil script, including mixed Tamil–English', () => {
    expect(detectTextLanguage('What is open with Lotus Apparel?')).toBe('en')
    expect(detectTextLanguage('Lotus Apparel-இல் நிலுவையில் உள்ளவை என்ன?')).toBe('ta')
    expect(isMostlyTamil('கவிதாவுடன் பேசினேன்.')).toBe(true)
    expect(isMostlyTamil('Call with Priya. சரி.')).toBe(false)
  })
})

describe('mock Ask answers', () => {
  it('answers an English question in English with supporting records', () => {
    const r = answerQuestion({ question: 'What is open with Lotus Apparel?', responseLanguage: 'auto' }, ctx)
    expect(r.language).toBe('en')
    expect(r.languageSource).toBe('detected')
    expect(r.status).toBe('answered')
    expect(r.matches.length).toBeGreaterThan(0)
    expect(r.summary).toMatch(/^I found/)
  })

  it('answers a Tamil question in Tamil, matching English records via the glossary', () => {
    const r = answerQuestion({ question: 'எந்த இன்வாய்ஸைச் செலுத்தக் கூடாது?', responseLanguage: 'auto' }, ctx)
    expect(r.language).toBe('ta')
    expect(r.status).toBe('answered')
    expect(r.matches[0].id).toBe('m_freight')
    expect(r.summary).toMatch(/[஀-௿]/)
    // Record titles are never translated.
    expect(r.matches[0].title).toBe('Do not pay the original September freight invoice')
  })

  it('handles Tamil–English code-switched questions', () => {
    const r = answerQuestion({ question: 'Lotus Apparel-இல் நிலுவையில் உள்ளவை என்ன?', responseLanguage: 'auto' }, ctx)
    expect(r.language).toBe('ta')
    expect(r.matches.some((m) => m.title.includes('Lotus'))).toBe(true)
  })

  it('finds Tamil-language records', () => {
    const r = answerQuestion({ question: 'பொங்கல் நிறங்கள் என்ன?', responseLanguage: 'auto' }, ctx)
    expect(r.matches.some((m) => m.id === 'm_pongal')).toBe(true)
  })

  it('follows the response-language preference over the question language', () => {
    const r = answerQuestion({ question: 'What is open with Lotus Apparel?', responseLanguage: 'ta' }, ctx)
    expect(r.language).toBe('ta')
    expect(r.languageSource).toBe('preference')
    expect(r.speechText).toMatch(/[஀-௿]/)
  })

  it('does not guess when nothing supports an answer', () => {
    for (const question of ['What is our refund policy?', 'நமது ரீஃபண்ட் கொள்கை என்ன?']) {
      const r = answerQuestion({ question, responseLanguage: 'auto' }, ctx)
      expect(r.status).toBe('unsupported')
      expect(r.matches).toEqual([])
    }
  })

  it('never reads another workspace', () => {
    const other = {
      memories: seed.memories.filter((m) => m.workspaceId === 'ws_kaveri'),
      commitments: seed.commitments.filter((c) => c.workspaceId === 'ws_kaveri'),
      people: seed.people.filter((p) => p.workspaceId === 'ws_kaveri'),
    }
    const r = answerQuestion({ question: 'What is open with Lotus Apparel?', responseLanguage: 'auto' }, other)
    expect(r.matches.every((m) => !m.title.includes('Lotus'))).toBe(true)
  })
})
