/**
 * MOCK SERVICE — in-memory implementation of `NenaivuApi`.
 *
 * - Data lives in this browser tab only and resets on reload.
 * - Latency is simulated; failures can be forced from Settings → Prototype controls.
 * - Extraction is rule-based (see mockExtractor.ts), not AI.
 * - Ask is keyword matching over confirmed records with templated English/Tamil
 *   answers (mockAsk.ts), not generative AI.
 */
import { buildMockSeed, CURRENT_USER, type DataSnapshot } from '@/data/mockSeed'
import { todayISO } from '@/lib/dates'
import { createId, sleep } from '@/lib/utils'
import type { ActivityEvent, ActivityParams, ActivityType, Capture, Commitment, ID, Memory, Person } from '@/types/models'
import { ServiceError, type NenaivuApi, type WorkspaceData } from '../api'
import { answerQuestion } from './mockAsk'
import { extractProposals } from './mockExtractor'

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
    throw new ServiceError('forced_failure')
  }
}

function assertWorkspace(workspaceId: ID) {
  if (!db.workspaces.some((w) => w.id === workspaceId)) throw new ServiceError('workspace_not_found')
}

function log(workspaceId: ID, type: ActivityType, params: ActivityParams, refs: ID[]): ActivityEvent {
  const event: ActivityEvent = {
    id: createId('a'),
    workspaceId,
    type,
    at: new Date().toISOString(),
    actorId: CURRENT_USER.id,
    params,
    refs,
  }
  db.activity = [event, ...db.activity]
  return event
}

const clone = <T,>(value: T): T => structuredClone(value)

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
    if (!trimmed) throw new ServiceError('capture_empty')

    const capture: Capture = {
      id: createId('c'),
      workspaceId,
      kind,
      content, // stored exactly as given — never rewritten
      fileName,
      channel: kind === 'file' ? 'file' : 'quick_capture',
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
    const activity = log(workspaceId, 'capture_created', { captureKind: kind, fileName, proposalCount: proposals.length }, [capture.id])
    return clone({ capture, proposals, activity })
  },

  async approveProposal(workspaceId, proposalId, input) {
    await simulate(500)
    const proposal = db.proposals.find((p) => p.id === proposalId && p.workspaceId === workspaceId)
    if (!proposal) throw new ServiceError('proposal_not_found')
    if (proposal.status !== 'pending') throw new ServiceError('already_resolved')
    if (!input.title.trim()) throw new ServiceError('title_required')
    if (input.recordType === 'commitment' && proposal.fields.deadline.kind === 'ambiguous' && input.dueDate === undefined) {
      throw new ServiceError('deadline_unresolved')
    }
    if (input.personId && !db.people.some((p) => p.id === input.personId && p.workspaceId === workspaceId)) {
      throw new ServiceError('person_not_in_workspace')
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

    const name = 'title' in record.value ? record.value.title : record.value.name
    const activity = log(workspaceId, 'proposal_approved', { recordType: input.recordType, title: name, editedFields: input.editedFields }, [
      record.value.id,
      proposal.id,
      proposal.captureId,
    ])
    return clone({ proposal, record, activity })
  },

  async rejectProposal(workspaceId, proposalId, reason) {
    await simulate(400)
    const proposal = db.proposals.find((p) => p.id === proposalId && p.workspaceId === workspaceId)
    if (!proposal) throw new ServiceError('proposal_not_found')
    if (proposal.status !== 'pending') throw new ServiceError('already_resolved')
    proposal.status = 'rejected'
    proposal.resolvedAt = new Date().toISOString()
    proposal.resolvedBy = CURRENT_USER.id
    proposal.rejectionReason = reason?.trim() || undefined
    const activity = log(
      workspaceId,
      'proposal_rejected',
      { recordType: proposal.recordType, title: proposal.fields.title, reason: proposal.rejectionReason },
      [proposal.id, proposal.captureId],
    )
    return clone({ proposal, activity })
  },

  async updateCommitment(workspaceId, commitmentId, update) {
    await simulate(350)
    const c = db.commitments.find((x) => x.id === commitmentId && x.workspaceId === workspaceId)
    if (!c) throw new ServiceError('commitment_not_found')
    const events: ActivityEvent[] = []
    if (update.status && update.status !== c.status) {
      const from = c.status
      c.status = update.status
      c.completedAt = update.status === 'done' ? new Date().toISOString() : undefined
      events.push(log(workspaceId, 'commitment_status_changed', { title: c.title, from, to: update.status }, [c.id]))
    }
    if (update.dueDate !== undefined && (update.dueDate ?? undefined) !== c.dueDate) {
      c.dueDate = update.dueDate ?? undefined
      events.push(log(workspaceId, 'commitment_due_date_changed', { title: c.title, date: update.dueDate ?? undefined }, [c.id]))
    }
    return clone({ commitment: c, activity: events })
  },

  async ask(workspaceId, input) {
    await simulate(900)
    assertWorkspace(workspaceId)
    const inWs = <T extends { workspaceId: ID }>(items: T[]) => items.filter((i) => i.workspaceId === workspaceId)
    // Only confirmed records of the requested workspace are searched — never proposals,
    // never another workspace. Voice questions arrive here as text, under the same rules.
    const result = answerQuestion(input, {
      memories: inWs(db.memories),
      commitments: inWs(db.commitments),
      people: inWs(db.people),
    })
    return clone({ ...result, askedAt: new Date().toISOString() })
  },
}
