/**
 * MOCK EXTRACTION — rule-based stand-in for the future AI "Understand" step.
 *
 * Deliberately conservative:
 * - Only resolves a deadline when the text names a specific date or an
 *   unambiguous relative day ("today", "tomorrow", "within 3 days").
 * - Weekday names, "next week", "end of the month", "soon" etc. are returned as
 *   `ambiguous` so the reviewer must choose a date. Nothing is invented.
 * - Explains uncertainty as codes rendered in words; never confidence percentages.
 * - Understands English notes only. Notes mainly in Tamil become one memory proposal.
 */
import { addDays, parseISODate, toISODate } from '@/lib/dates'
import { isMostlyTamil } from '@/lib/language'
import { createId, truncate } from '@/lib/utils'
import type {
  Capture,
  Commitment,
  CommitmentDirection,
  DeadlineReason,
  ISODate,
  Memory,
  Person,
  Proposal,
  ProposedDeadline,
  Uncertainty,
} from '@/types/models'

interface ExtractContext {
  capture: Capture
  today: ISODate
  people: Person[]
  commitments: Commitment[]
  memories: Memory[]
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, fourteen: 14 }

const NAME_STOPWORDS = new Set([
  'met', 'call', 'called', 'email', 'emailed', 'meeting', 'we', 'i', 'the', 'also', 'need', 'please', 'they', 'he', 'she',
  'our', 'their', 'from', 'with', 'and', 'but', 'note', 'todo', 'follow', 'send', 'reply', 'asked', 'told', 'spoke',
  ...WEEKDAYS, 'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'mom', 'moq', 'gst', 'po', 'ok',
])
const ORG_SUFFIXES = /\b(Ltd|Limited|Pvt|LLP|Inc|Corp|Co|Company|Apparel|Logistics|Export|Exports|House|Studio|Coffee|Industries|Textiles|Traders|Enterprises|Mills|Bank|Group|Labs|Foods|Agency)\b/

const COMMITMENT_CUE =
  /\b(will|'ll|promised|promise|agreed to|need to|needs to|must|have to|has to|going to|to send|to share|to deliver|follow up|reply|remind)\b/i

const TERM_STOPWORDS = new Set(['the', 'and', 'with', 'from', 'that', 'this', 'will', 'need', 'send', 'they', 'their', 'have', 'about', 'for', 'our', 'to', 'of', 'a'])

// ── Text helpers ────────────────────────────────────────────────────────────

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function keyTerms(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !TERM_STOPWORDS.has(w)),
  )
}

function similarity(a: string, b: string): number {
  const A = keyTerms(a)
  const B = keyTerms(b)
  if (A.size === 0 || B.size === 0) return 0
  let shared = 0
  A.forEach((t) => B.has(t) && shared++)
  return shared / Math.min(A.size, B.size)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mentions(sentence: string, person: Person): boolean {
  const full = new RegExp(`\\b${escapeRegExp(person.name)}\\b`, 'i')
  if (full.test(sentence)) return true
  if (person.kind === 'person') {
    const first = person.name.split(' ')[0]
    return new RegExp(`\\b${escapeRegExp(first)}\\b`).test(sentence)
  }
  return false
}

// ── Deadlines ───────────────────────────────────────────────────────────────

export function detectDeadline(sentence: string, today: ISODate): ProposedDeadline {
  const s = sentence.toLowerCase()

  const iso = sentence.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (iso) return { kind: 'exact', date: iso[1], phrase: iso[1] }

  // "12 Nov", "12th November 2026", "Nov 12"
  const dm = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s+(\d{4}))?/)
  const md = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/)
  const parts = dm ? { day: +dm[1], mon: dm[2], year: dm[3], phrase: dm[0] } : md ? { day: +md[2], mon: md[1], year: md[3], phrase: md[0] } : null
  if (parts) {
    const month = MONTHS.indexOf(parts.mon)
    const base = parseISODate(today)
    let year = parts.year ? +parts.year : base.getFullYear()
    let candidate = new Date(year, month, parts.day)
    if (!parts.year && toISODate(candidate) < today) {
      year += 1
      candidate = new Date(year, month, parts.day)
    }
    if (candidate.getMonth() === month) {
      return {
        kind: 'exact',
        date: toISODate(candidate),
        phrase: parts.phrase,
        note: parts.year ? undefined : { code: 'year_assumed', params: { phrase: parts.phrase, year } },
      }
    }
  }

  if (/\b(today|tonight|eod|end of day)\b/.test(s)) return { kind: 'exact', date: today, phrase: 'today', note: { code: 'resolved_today' } }
  if (/\btomorrow\b/.test(s)) return { kind: 'exact', date: addDays(today, 1), phrase: 'tomorrow', note: { code: 'resolved_tomorrow' } }

  const within = s.match(/\bwithin\s+(\d+|one|two|three|four|five|six|seven|ten|fourteen)\s+days?\b/)
  if (within) {
    const n = Number.isNaN(+within[1]) ? NUMBER_WORDS[within[1]] : +within[1]
    return { kind: 'exact', date: addDays(today, n), phrase: within[0], note: { code: 'counted_days', params: { count: n } } }
  }

  const weekday = WEEKDAYS.find((d) => new RegExp(`\\b${d}\\b`).test(s))
  if (weekday) {
    const phrase = s.match(new RegExp(`\\b(?:by|on|before|this|next|until)?\\s*(?:this |next )?${weekday}\\b`))?.[0].trim() ?? weekday
    return { kind: 'ambiguous', phrase, reason: { code: 'weekday', weekday: WEEKDAYS.indexOf(weekday) } }
  }

  const vague: [RegExp, DeadlineReason][] = [
    [/\b(?:by\s+)?end of (?:the |this )?month\b/, { code: 'month_end' }],
    [/\b(?:by\s+)?end of (?:the |this )?week\b/, { code: 'week_end' }],
    [/\bnext week\b/, { code: 'no_day' }],
    [/\bnext month\b/, { code: 'no_day' }],
    [/\b(?:asap|as soon as possible|soon|shortly|in a few days|later)\b/, { code: 'not_a_date' }],
  ]
  for (const [re, reason] of vague) {
    const m = s.match(re)
    if (m) return { kind: 'ambiguous', phrase: m[0], reason }
  }
  return { kind: 'none' }
}

// ── Names ───────────────────────────────────────────────────────────────────

function unknownNames(text: string, known: Person[]): { name: string; kind: 'person' | 'organisation'; excerpt: string }[] {
  const found = new Map<string, { name: string; kind: 'person' | 'organisation'; excerpt: string }>()
  for (const sentence of splitSentences(text)) {
    const re = /\b([A-Z][a-zA-Z&]+(?:\s+[A-Z][a-zA-Z&]+){1,3})\b/g
    let m: RegExpExecArray | null
    while ((m = re.exec(sentence))) {
      const words = m[1].split(/\s+/)
      while (words.length && NAME_STOPWORDS.has(words[0].toLowerCase())) words.shift()
      if (words.length < 2) continue
      const name = words.join(' ')
      if (known.some((p) => p.name.toLowerCase() === name.toLowerCase())) continue
      if (words.some((w) => NAME_STOPWORDS.has(w.toLowerCase()))) continue
      const kind = ORG_SUFFIXES.test(name) ? 'organisation' : 'person'
      if (!found.has(name.toLowerCase())) found.set(name.toLowerCase(), { name, kind, excerpt: sentence })
    }
  }
  return [...found.values()]
}

// ── Main ────────────────────────────────────────────────────────────────────

function cleanTitle(sentence: string): string {
  let t = sentence.replace(/[.!?]+$/, '').trim()
  t = t.replace(/^(also|and|so|ok|note)[,:]?\s+/i, '')
  t = t.replace(/^(i|we)\s+(promised|need|needs|have|must|agreed|will|'ll)\s+(to\s+)?/i, '')
  t = t.replace(/^.*?[—–-]\s+(need|needs)\s+to\s+/i, '')
  return truncate(t.charAt(0).toUpperCase() + t.slice(1), 90)
}

export function extractProposals(ctx: ExtractContext): Proposal[] {
  const { capture, today, people } = ctx
  const sentences = splitSentences(capture.content)
  const base = { workspaceId: capture.workspaceId, captureId: capture.id, status: 'pending' as const, createdAt: capture.createdAt }
  const proposals: Proposal[] = []

  // The rules below only understand English. A note written mainly in Tamil is kept
  // whole as one memory proposal instead of producing wrong extractions.
  if (isMostlyTamil(capture.content)) {
    return [
      {
        ...base,
        id: createId('pr'),
        recordType: 'memory',
        sourceExcerpt: capture.content,
        fields: {
          title: truncate(sentences[0]?.replace(/[.!?]+$/, '') ?? capture.content, 80),
          summary: capture.content.trim(),
          deadline: { kind: 'none' },
          direction: 'we_owe',
          partyKind: 'person',
        },
        uncertainties: [{ code: 'non_english_note' }],
      },
    ]
  }

  const mentionedKnown = people.filter((p) => mentions(capture.content, p))
  const newNames = unknownNames(capture.content, people)

  const memorySentences: string[] = []

  for (const sentence of sentences) {
    // "will be" describes a state ("the order will be 1,500 m"), not an action someone owes.
    if (!COMMITMENT_CUE.test(sentence.replace(/\bwill be\b/gi, ''))) {
      if (sentence.length > 24) memorySentences.push(sentence)
      continue
    }

    const uncertainties: Uncertainty[] = []
    const linked = mentionedKnown.find((p) => mentions(sentence, p))
    const unknown = newNames.find((n) => sentence.includes(n.name))
    let personId = linked?.id
    let personName = !linked ? unknown?.name : undefined

    if (!linked && !unknown && /\b(he|she|they)\b/i.test(sentence) && mentionedKnown.filter((p) => p.kind === 'person').length === 1) {
      const only = mentionedKnown.find((p) => p.kind === 'person')!
      personId = only.id
      uncertainties.push({ code: 'pronoun_assumed', params: { pronoun: sentence.match(/\b(he|she|they)\b/i)![0], name: only.name } })
    }
    if (linked && linked.kind === 'person' && !new RegExp(`\\b${escapeRegExp(linked.name)}\\b`, 'i').test(sentence)) {
      const sameFirst = people.filter((p) => p.kind === 'person' && p.name.split(' ')[0] === linked.name.split(' ')[0])
      const short = linked.name.split(' ')[0]
      uncertainties.push(
        sameFirst.length > 1 ? { code: 'name_ambiguous', params: { short } } : { code: 'name_matched', params: { short, name: linked.name } },
      )
    }
    if (personName) uncertainties.push({ code: 'not_confirmed_contact', params: { name: personName } })

    let direction: CommitmentDirection = 'we_owe'
    const subject = sentence.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
    if (/^(i|we|need|must)$/.test(subject) || /\b(we|i)\s+(will|need|must|promised|agreed|have)\b/i.test(sentence)) {
      direction = 'we_owe'
    } else if (/\b(he|she|they)\s+(will|'ll|promised|agreed)\b/i.test(sentence) || (linked && sentence.indexOf(linked.name.split(' ')[0]) <= 2)) {
      direction = 'owed_to_us'
    } else {
      uncertainties.push({ code: 'direction_unclear' })
    }

    const deadline = detectDeadline(sentence, today)
    if (deadline.kind === 'none') uncertainties.push({ code: 'no_deadline' })
    if (deadline.kind === 'exact' && deadline.note) uncertainties.push(deadline.note)

    const title = cleanTitle(sentence)
    const dupe = ctx.commitments.find((c) => c.status === 'open' && similarity(c.title, title) >= 0.6)

    proposals.push({
      ...base,
      id: createId('pr'),
      recordType: 'commitment',
      sourceExcerpt: sentence,
      fields: {
        title,
        summary: '',
        personId,
        personName,
        deadline,
        direction,
        partyKind: 'person',
      },
      uncertainties,
      possibleDuplicateOf: dupe ? { recordType: 'commitment', id: dupe.id } : undefined,
    })
  }

  for (const n of newNames) {
    proposals.push({
      ...base,
      id: createId('pr'),
      recordType: 'person',
      sourceExcerpt: n.excerpt,
      fields: {
        title: n.name,
        summary: '',
        deadline: { kind: 'none' },
        direction: 'we_owe',
        partyKind: n.kind,
      },
      uncertainties: [{ code: n.kind === 'organisation' ? 'org_detected' : 'person_detected' }],
    })
  }

  // One memory summarising the informational sentences (or the whole note if nothing else was found).
  const memoryText = memorySentences.length ? memorySentences : proposals.length === 0 ? sentences : []
  if (memoryText.length) {
    const summary = memoryText.join(' ')
    const title = cleanTitle(memoryText[0])
    const dupe = ctx.memories.find((m) => similarity(m.title, title) >= 0.7)
    proposals.push({
      ...base,
      id: createId('pr'),
      recordType: 'memory',
      sourceExcerpt: summary,
      fields: {
        title: truncate(title, 80),
        summary,
        personId: mentionedKnown[0]?.id,
        personName: !mentionedKnown[0] ? newNames[0]?.name : undefined,
        deadline: { kind: 'none' },
        direction: 'we_owe',
        partyKind: 'person',
      },
      uncertainties: memoryText.length > 1 ? [{ code: 'combined_sentences' }] : [],
      possibleDuplicateOf: dupe ? { recordType: 'memory', id: dupe.id } : undefined,
    })
  }

  return proposals
}
