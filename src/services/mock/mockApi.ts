/**
 * MOCK SERVICE — in-memory implementation of `NenaivuApi`.
 *
 * - Data lives in this browser tab only and resets on reload.
 * - Latency is simulated; failures can be forced from Settings → Prototype controls.
 * - Extraction is rule-based (see mockExtractor.ts), not AI.
 * - Ask is keyword matching over confirmed records, not generative AI.
 */
import { buildMockSeed, CURRENT_USER, type DataSnapshot } from '@/data/mockSeed'
import { todayISO } from '@/lib/dates'
import { createId, pluralise, sleep } from '@/lib/utils'
import type { ActivityEvent, ActivityType, Commitment, ID, Memory, Person } from '@/types/models'
import {
  ServiceError,
  type AskMatch,
  type NenaivuApi,
  type WorkspaceData,
} from '../api'
import { extractProposals, keyTerms } from './mockExtractor'

let db: DataSnapshot = buildMockSeed()

export const prototypeControls = {
  latency: true,
  failNextRequests: false,
}

export function resetMockData() {
  db = buildMockSeed()
}

async function simulate(ms: number) {
  if (prototypeControls.latency) await sleep(ms)
  if (prototypeControls.failNextRequests) {
    throw new ServiceError('The mock service was set to fail (Settings → Prototype controls).')
  }
}

function assertWorkspace(workspaceId: ID) {
  if (!db.workspaces.some((w) => w.id === workspaceId)) throw new ServiceError('Workspace not found.')
}

function log(workspaceId: ID, type: ActivityType, message: string, refs: ID[]): ActivityEvent {
  const event: ActivityEvent = {
    id: createId('a'),
    workspaceId,
    type,
    at: new Date().toISOString(),
    actorId: CURRENT_USER.id,
    message,
    refs,
  }
  db.activity = [event, ...db.activity]
  return event
}

const clone = <T,>(value: T): T => structuredClone(value)

const RECORD_LABEL = { commitment: 'commitment', memory: 'memory', person: 'contact' } as const

export const mockApi: NenaivuApi = {
  async getCurrentUser() {
    return clone(CURRENT_USER)
  },

  async listWorkspaces() {
    return clone(db.workspaces)
  },

  async loadWorkspace(workspaceId) {
    await simulate(550)
    assertWorkspace(workspaceId)
    const inWs = <T extends { workspaceId: ID }>(items: T[]) => items.filter((i) => i.workspaceId === workspaceId)
    const data: WorkspaceData = {
      workspace: db.workspaces.find((w) => w.id === workspaceId)!,
      people: inWs(db.people),
      captures: inWs(db.captures),
      proposals: inWs(db.proposals),
      memories: inWs(db.memories),
      commitments: inWs(db.commitments),
      activity: inWs(db.activity),
    }
    return clone(data)
  },

  async createCapture({ workspaceId, content, kind, fileName }) {
    await simulate(1400)
    assertWorkspace(workspaceId)
    const trimmed = content.trim()
    if (!trimmed) throw new ServiceError('Capture is empty.')

    const capture = {
      id: createId('c'),
      workspaceId,
      kind,
      content, // stored exactly as given — never rewritten
      fileName,
      channel: kind === 'file' ? 'File (read in browser)' : 'Quick Capture',
      createdAt: new Date().toISOString(),
      createdBy: CURRENT_USER.id,
    }
    const proposals = extractProposals({
      capture,
      today: todayISO(),
      people: db.people.filter((p) => p.workspaceId === workspaceId),
      commitments: db.commitments.filter((c) => c.workspaceId === workspaceId),
      memories: db.memories.filter((m) => m.workspaceId === workspaceId),
    })
    db.captures = [capture, ...db.captures]
    db.proposals = [...proposals, ...db.proposals]
    const activity = log(
      workspaceId,
      'capture_created',
      `Captured ${kind === 'file' ? `file "${fileName}"` : 'note'} via Quick Capture (${pluralise(proposals.length, 'proposal')})`,
      [capture.id],
    )
    return clone({ capture, proposals, activity })
  },

  async approveProposal(workspaceId, proposalId, input) {
    await simulate(500)
    const proposal = db.proposals.find((p) => p.id === proposalId && p.workspaceId === workspaceId)
    if (!proposal) throw new ServiceError('Proposal not found in this workspace.')
    if (proposal.status !== 'pending') throw new ServiceError('This proposal has already been resolved.')
    if (!input.title.trim()) throw new ServiceError('A title is required.')
    if (input.recordType === 'commitment' && proposal.fields.deadline.kind === 'ambiguous' && input.dueDate === undefined) {
      throw new ServiceError('Resolve the ambiguous deadline before approving.')
    }
    if (input.personId && !db.people.some((p) => p.id === input.personId && p.workspaceId === workspaceId)) {
      throw new ServiceError('Linked person is not in this workspace.')
    }

    const now = new Date().toISOString()
    const common = { workspaceId, sourceCaptureId: proposal.captureId, confirmedAt: now, confirmedBy: CURRENT_USER.id }
    let record: Awaited<ReturnType<NenaivuApi['approveProposal']>>['record']

    if (input.recordType === 'commitment') {
      const value: Commitment = {
        ...common,
        id: createId('k'),
        title: input.title.trim(),
        description: input.summary.trim(),
        direction: input.direction,
        personId: input.personId,
        dueDate: input.dueDate ?? undefined,
        status: 'open',
        proposalId,
      }
      db.commitments = [value, ...db.commitments]
      record = { type: 'commitment', value }
    } else if (input.recordType === 'memory') {
      const value: Memory = {
        ...common,
        id: createId('m'),
        title: input.title.trim(),
        summary: input.summary.trim(),
        personIds: input.personId ? [input.personId] : [],
        proposalId,
      }
      db.memories = [value, ...db.memories]
      record = { type: 'memory', value }
    } else {
      const value: Person = {
        id: createId('p'),
        workspaceId,
        kind: input.partyKind,
        name: input.title.trim(),
        role: input.summary.trim() || undefined,
        sourceCaptureId: proposal.captureId,
        createdAt: now,
      }
      db.people = [...db.people, value]
      record = { type: 'person', value }
    }

    proposal.status = 'approved'
    proposal.resolvedAt = now
    proposal.resolvedBy = CURRENT_USER.id
    proposal.resultingRecordId = record.value.id

    const edits = input.editedFields.length ? ` with edits to ${input.editedFields.join(', ')}` : ''
    const name = 'title' in record.value ? record.value.title : record.value.name
    const activity = log(workspaceId, 'proposal_approved', `Approved ${RECORD_LABEL[input.recordType]} "${name}"${edits}`, [
      record.value.id,
      proposal.id,
      proposal.captureId,
    ])
    return clone({ proposal, record, activity })
  },

  async rejectProposal(workspaceId, proposalId, reason) {
    await simulate(400)
    const proposal = db.proposals.find((p) => p.id === proposalId && p.workspaceId === workspaceId)
    if (!proposal) throw new ServiceError('Proposal not found in this workspace.')
    if (proposal.status !== 'pending') throw new ServiceError('This proposal has already been resolved.')
    proposal.status = 'rejected'
    proposal.resolvedAt = new Date().toISOString()
    proposal.resolvedBy = CURRENT_USER.id
    proposal.rejectionReason = reason?.trim() || undefined
    const activity = log(
      workspaceId,
      'proposal_rejected',
      `Rejected proposed ${RECORD_LABEL[proposal.recordType]} "${proposal.fields.title}"${proposal.rejectionReason ? ` — ${proposal.rejectionReason}` : ''}`,
      [proposal.id, proposal.captureId],
    )
    return clone({ proposal, activity })
  },

  async updateCommitment(workspaceId, commitmentId, update) {
    await simulate(350)
    const c = db.commitments.find((x) => x.id === commitmentId && x.workspaceId === workspaceId)
    if (!c) throw new ServiceError('Commitment not found in this workspace.')
    const events: ActivityEvent[] = []
    if (update.status && update.status !== c.status) {
      const from = c.status
      c.status = update.status
      c.completedAt = update.status === 'done' ? new Date().toISOString() : undefined
      const label = { open: 'open', done: 'done', cancelled: 'cancelled' }
      events.push(log(workspaceId, 'commitment_status_changed', `Changed "${c.title}" from ${label[from]} to ${label[update.status]}`, [c.id]))
    }
    if (update.dueDate !== undefined && (update.dueDate ?? undefined) !== c.dueDate) {
      c.dueDate = update.dueDate ?? undefined
      events.push(
        log(workspaceId, 'commitment_due_date_changed', update.dueDate ? `Set due date of "${c.title}" to ${update.dueDate}` : `Removed due date from "${c.title}"`, [c.id]),
      )
    }
    return clone({ commitment: c, activity: events })
  },

  async ask(workspaceId, question) {
    await simulate(900)
    assertWorkspace(workspaceId)
    const terms = [...keyTerms(question)]
    const people = db.people.filter((p) => p.workspaceId === workspaceId)
    const personName = (id?: ID) => people.find((p) => p.id === id)?.name
    const candidates: Omit<AskMatch, 'matchedTerms'>[] = [
      ...db.memories
        .filter((m) => m.workspaceId === workspaceId)
        .map((m) => ({ type: 'memory' as const, id: m.id, title: m.title, detail: m.summary, sourceCaptureId: m.sourceCaptureId })),
      ...db.commitments
        .filter((c) => c.workspaceId === workspaceId)
        .map((c) => ({
          type: 'commitment' as const,
          id: c.id,
          title: c.title,
          detail: [
            c.status === 'open' ? 'Open' : c.status === 'done' ? 'Done' : 'Cancelled',
            c.dueDate ? `due ${c.dueDate}` : 'no due date',
            personName(c.personId) ? `with ${personName(c.personId)}` : '',
            c.description,
          ]
            .filter(Boolean)
            .join(' · '),
          sourceCaptureId: c.sourceCaptureId,
        })),
      ...people.map((p) => ({
        type: 'person' as const,
        id: p.id,
        title: p.name,
        detail: [p.kind === 'organisation' ? 'Organisation' : 'Person', p.role, personName(p.organisationId)].filter(Boolean).join(' · '),
        sourceCaptureId: p.sourceCaptureId,
      })),
    ]
    const matches: AskMatch[] = candidates
      .map((c) => {
        const haystack = keyTerms(`${c.title} ${c.detail}`)
        const matched = terms.filter((t) => haystack.has(t) || [...haystack].some((h) => h.startsWith(t) || t.startsWith(h)))
        return { ...c, matchedTerms: matched }
      })
      .filter((m) => m.matchedTerms.length > 0)
      .sort((a, b) => b.matchedTerms.length - a.matchedTerms.length)
      .slice(0, 6)
    const covered = new Set(matches.flatMap((m) => m.matchedTerms))
    return clone({
      question,
      askedAt: new Date().toISOString(),
      matches,
      unmatchedTerms: terms.filter((t) => !covered.has(t)),
    })
  },
}
