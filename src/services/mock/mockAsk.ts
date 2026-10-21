/**
 * MOCK ASK — stand-in for a source-grounded retrieval + answer service.
 *
 * - Retrieval: keyword overlap with confirmed records in ONE workspace.
 * - Tamil questions: a small glossary maps common Tamil business words to the
 *   English words used in records; Latin-script words in mixed questions match directly.
 * - Answers: fixed English/Tamil templates (below). No generative AI is involved.
 * - Never answers without a supporting record.
 */
import { detectTextLanguage } from '@/lib/language'
import type { Commitment, ID, Memory, Person } from '@/types/models'
import type { AnswerLanguage, AskInput, AskMatch, AskResult } from '../api'

interface AskContext {
  memories: Memory[]
  commitments: Commitment[]
  people: Person[]
}

const EN_STOP = new Set([
  'what', 'which', 'when', 'where', 'who', 'whom', 'whose', 'does', 'did', 'do', 'is', 'are', 'was', 'were', 'the', 'and',
  'with', 'from', 'that', 'this', 'will', 'need', 'they', 'their', 'have', 'has', 'about', 'for', 'our', 'we', 'us', 'to',
  'of', 'a', 'an', 'any', 'should', 'not', 'there', 'still', 'tell', 'me', 'please', 'how', 'can', 'could', 'would',
])
const TA_STOP = new Set([
  'என்ன', 'எந்த', 'எது', 'எவை', 'யார்', 'எப்போது', 'எங்கே', 'உள்ளவை', 'உள்ளது', 'உடன்', 'நமது', 'நம்', 'நாம்', 'பற்றி',
  'இருக்கிறது', 'கூடாது', 'வேண்டும்', 'இன்னும்', 'சொல்லுங்கள்', 'என்று', 'அளித்தோம்', 'செய்ய', 'கொடுக்க',
])

/** Tamil words (stems) → English words that appear in records. Prototype vocabulary only. */
const TA_GLOSSARY: [string, string[]][] = [
  ['நிலுவை', ['open']],
  ['இன்வாய்ஸ', ['invoice']],
  ['விலைப்பட்டியல', ['invoice']],
  ['பில்', ['invoice']],
  ['செலுத்த', ['pay']],
  ['மாதிரி', ['samples', 'swatches']],
  ['விலை', ['pricing', 'price', 'quote']],
  ['சரக்கு', ['freight']],
  ['ஃப்ரைட்', ['freight']],
  ['ஆலை', ['mill']],
  ['மில்', ['mill']],
  ['சாய', ['dyeing']],
  ['லினன்', ['linen']],
  ['லோகோ', ['logo']],
  ['கணக்காளர', ['accountant']],
  ['வாக்குறுதி', ['open']],
  ['ரீஃபண்ட', ['refund']],
  ['கொள்கை', ['policy']],
]

interface Term {
  /** What is matched against records. */
  key: string
  /** The word as written in the question (shown when unmatched). */
  surface: string
}

/** Tokens for record text: Latin words (4+ letters) and Tamil words, lower-cased. */
function recordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9஀-௿\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => (/[஀-௿]/.test(w) ? w.length >= 3 : w.length > 3))
}

function questionTerms(question: string): Term[] {
  const terms: Term[] = []
  const words = question.replace(/[^A-Za-z0-9஀-௿\s-]/g, ' ').split(/[\s-]+/).filter(Boolean)
  for (const w of words) {
    if (/[஀-௿]/.test(w)) {
      if (TA_STOP.has(w)) continue
      const hit = TA_GLOSSARY.find(([stem]) => w.startsWith(stem))
      if (hit) hit[1].forEach((key) => terms.push({ key, surface: w }))
      // Very short Tamil tokens are usually case suffixes split off a word (e.g. "-இல்").
      else if (w.length >= 4) terms.push({ key: w, surface: w })
    } else {
      const lw = w.toLowerCase()
      if (lw.length > 3 && !EN_STOP.has(lw)) terms.push({ key: lw, surface: w })
    }
  }
  // De-duplicate by key, keep first surface form.
  return terms.filter((t, i) => terms.findIndex((x) => x.key === t.key) === i)
}

function tokenMatches(tokens: string[], key: string) {
  return tokens.some((tok) => tok === key || tok.startsWith(key) || (key.length > 4 && key.startsWith(tok)))
}

// ── Answer templates (the mock "model output") ──────────────────────────────

const LOCALE: Record<AnswerLanguage, string> = { en: 'en-IN', ta: 'ta-IN' }

function quoteList(lang: AnswerLanguage, words: string[]) {
  return new Intl.ListFormat(LOCALE[lang], { style: 'long', type: 'conjunction' }).format(words.map((w) => `“${w}”`))
}

function formatDue(lang: AnswerLanguage, iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d))
}

const TEMPLATES = {
  en: {
    found: (n: number) => `I found ${n === 1 ? '1 confirmed record' : `${n} confirmed records`} related to your question. Each one is linked below with its source.`,
    unsupported: 'No confirmed record in this workspace mentions this, so I can’t answer it. Nenaivu doesn’t guess.',
    unanswered: (words: string[]) => `No confirmed record mentions ${quoteList('en', words)}, so that part of your question is unanswered.`,
    commitment: (m: AskMatch) => {
      const c = m.commitment!
      const status = c.status === 'open' ? 'open' : c.status === 'done' ? 'done' : 'cancelled'
      const bits = [`${m.title} — ${status}`]
      if (c.dueDate) bits.push(`due ${formatDue('en', c.dueDate)}`)
      if (c.personName) bits.push(`with ${c.personName}`)
      return `${bits.join(', ')}.`
    },
    memory: (m: AskMatch) => `${m.title}. ${m.memory!.summary}`,
    person: (m: AskMatch) => `${m.title}${m.person!.role ? `, ${m.person!.role}` : ''}.`,
  },
  ta: {
    found: (n: number) => `உங்கள் கேள்வியுடன் தொடர்புடைய ${n} உறுதிசெய்யப்பட்ட ${n === 1 ? 'பதிவு கிடைத்தது' : 'பதிவுகள் கிடைத்தன'}. ஒவ்வொன்றும் அதன் மூலத்துடன் கீழே இணைக்கப்பட்டுள்ளது.`,
    unsupported: 'இந்தப் பணியிடத்தில் உறுதிசெய்யப்பட்ட எந்தப் பதிவிலும் இது பற்றிய தகவல் இல்லை. அதனால் பதில் சொல்ல முடியாது. Nenaivu ஊகித்துப் பதில் சொல்லாது.',
    unanswered: (words: string[]) => `${quoteList('ta', words)} பற்றி எந்த உறுதிசெய்யப்பட்ட பதிவிலும் தகவல் இல்லை. கேள்வியின் அந்தப் பகுதிக்குப் பதில் இல்லை.`,
    commitment: (m: AskMatch) => {
      const c = m.commitment!
      const status = c.status === 'open' ? 'நிலுவையில் உள்ளது' : c.status === 'done' ? 'முடிந்தது' : 'ரத்துசெய்யப்பட்டது'
      const bits = [`${m.title} — ${status}`]
      if (c.dueDate) bits.push(`கெடு ${formatDue('ta', c.dueDate)}`)
      if (c.personName) bits.push(`${c.personName} உடன்`)
      return `${bits.join(', ')}.`
    },
    memory: (m: AskMatch) => `${m.title}. ${m.memory!.summary}`,
    person: (m: AskMatch) => `${m.title}${m.person!.role ? `, ${m.person!.role}` : ''}.`,
  },
} satisfies Record<AnswerLanguage, unknown>

// ── Main ────────────────────────────────────────────────────────────────────

export function answerQuestion(input: AskInput, ctx: AskContext): Omit<AskResult, 'askedAt'> {
  const question = input.question.trim()
  const detected = detectTextLanguage(question)
  const language: AnswerLanguage = input.responseLanguage === 'auto' ? detected : input.responseLanguage
  const languageSource = input.responseLanguage === 'auto' ? 'detected' : 'preference'

  const personName = (id?: ID) => ctx.people.find((p) => p.id === id)?.name
  const candidates: Omit<AskMatch, 'matchedTerms'>[] = [
    ...ctx.memories.map((m) => ({ type: 'memory' as const, id: m.id, title: m.title, sourceCaptureId: m.sourceCaptureId, memory: { summary: m.summary } })),
    ...ctx.commitments.map((c) => ({
      type: 'commitment' as const,
      id: c.id,
      title: c.title,
      sourceCaptureId: c.sourceCaptureId,
      commitment: { status: c.status, dueDate: c.dueDate, personName: personName(c.personId), description: c.description },
    })),
    ...ctx.people.map((p) => ({
      type: 'person' as const,
      id: p.id,
      title: p.name,
      sourceCaptureId: p.sourceCaptureId,
      person: { kind: p.kind, role: p.role, organisationName: personName(p.organisationId) },
    })),
  ]

  const terms = questionTerms(question)
  const haystack = (c: (typeof candidates)[number]) =>
    recordTokens(
      [
        c.title,
        c.memory?.summary,
        c.commitment && [c.commitment.status, c.commitment.personName, c.commitment.description].join(' '),
        c.person && [c.person.role, c.person.organisationName].join(' '),
      ].join(' '),
    )

  const matches: AskMatch[] = candidates
    .map((c) => {
      const tokens = haystack(c)
      return { ...c, matchedTerms: terms.filter((t) => tokenMatches(tokens, t.key)).map((t) => t.surface) }
    })
    .filter((m) => m.matchedTerms.length > 0)
    .sort((a, b) => b.matchedTerms.length - a.matchedTerms.length)
    .slice(0, 6)

  const covered = new Set(matches.flatMap((m) => m.matchedTerms))
  const unmatchedTerms = [...new Set(terms.filter((t) => !covered.has(t.surface)).map((t) => t.surface))]

  const tpl = TEMPLATES[language]
  if (matches.length === 0) {
    return { question, language, languageSource, status: 'unsupported', summary: tpl.unsupported, speechText: tpl.unsupported, matches, unmatchedTerms }
  }
  const summary = tpl.found(matches.length)
  const unanswered = unmatchedTerms.length ? tpl.unanswered(unmatchedTerms) : undefined
  const lines = matches.map((m) => tpl[m.type](m))
  return {
    question,
    language,
    languageSource,
    status: 'answered',
    summary,
    unanswered,
    speechText: [summary, ...lines, unanswered].filter(Boolean).join(' '),
    matches,
    unmatchedTerms,
  }
}
