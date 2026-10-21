/**
 * Core domain models for Nenaivu AI.
 *
 * Trust boundaries encoded in the types:
 * - `Capture` is the immutable original input. Nothing edits it after creation.
 * - `Proposal` is a machine suggestion derived from a capture. It is never a record.
 * - `Memory`, `Commitment` and `Person` are confirmed records, created only by a human
 *   approving a proposal (or by seed data, which is labelled as mock).
 * - Every entity carries `workspaceId`; selectors never read across workspaces.
 */

export type ID = string
/** Calendar date as `YYYY-MM-DD` (no time zone ambiguity). */
export type ISODate = string
/** Full timestamp as an ISO 8601 string. */
export type ISODateTime = string

export interface Workspace {
  id: ID
  name: string
  industry: string
}

export interface User {
  id: ID
  name: string
  email: string
  initials: string
}

export type PartyKind = 'person' | 'organisation'

export interface Person {
  id: ID
  workspaceId: ID
  kind: PartyKind
  name: string
  role?: string
  organisationId?: ID
  notes?: string
  sourceCaptureId?: ID
  createdAt: ISODateTime
}

export type CaptureKind = 'text' | 'file'

export interface Capture {
  id: ID
  workspaceId: ID
  kind: CaptureKind
  /** Original text exactly as entered or read from the file. */
  content: string
  fileName?: string
  /** Where it came from, e.g. "Quick Capture". */
  channel: string
  createdAt: ISODateTime
  createdBy: ID
}

export type RecordType = 'commitment' | 'memory' | 'person'

/**
 * A proposed deadline. `ambiguous` means the source mentions timing that cannot be
 * resolved to a single date — the reviewer must clarify before any reminder exists.
 */
export type ProposedDeadline =
  | { kind: 'none' }
  | { kind: 'exact'; date: ISODate; phrase: string; note?: string }
  | { kind: 'ambiguous'; phrase: string; reason: string }

export type CommitmentDirection = 'we_owe' | 'owed_to_us'

export interface ProposalFields {
  title: string
  summary: string
  /** Linked existing person/organisation, if matched. */
  personId?: ID
  /** Name mentioned in the source that did not match an existing record. */
  personName?: string
  deadline: ProposedDeadline
  direction: CommitmentDirection
  partyKind: PartyKind
}

export type ProposalStatus = 'pending' | 'approved' | 'rejected'

export interface Proposal {
  id: ID
  workspaceId: ID
  captureId: ID
  recordType: RecordType
  status: ProposalStatus
  fields: ProposalFields
  /** The exact span of the capture this proposal was derived from. */
  sourceExcerpt: string
  /** Plain-language reasons the reviewer should double-check. No percentages. */
  uncertainties: string[]
  possibleDuplicateOf?: { recordType: 'commitment' | 'memory' | 'person'; id: ID }
  createdAt: ISODateTime
  resolvedAt?: ISODateTime
  resolvedBy?: ID
  rejectionReason?: string
  resultingRecordId?: ID
}

export interface Memory {
  id: ID
  workspaceId: ID
  title: string
  summary: string
  personIds: ID[]
  sourceCaptureId?: ID
  proposalId?: ID
  confirmedAt: ISODateTime
  confirmedBy: ID
}

export type CommitmentStatus = 'open' | 'done' | 'cancelled'

export interface Commitment {
  id: ID
  workspaceId: ID
  title: string
  description: string
  direction: CommitmentDirection
  personId?: ID
  /** Only set when a human confirmed a specific date. */
  dueDate?: ISODate
  status: CommitmentStatus
  sourceCaptureId?: ID
  proposalId?: ID
  confirmedAt: ISODateTime
  confirmedBy: ID
  completedAt?: ISODateTime
}

export type ActivityType =
  | 'capture_created'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'commitment_status_changed'
  | 'commitment_due_date_changed'

export interface ActivityEvent {
  id: ID
  workspaceId: ID
  type: ActivityType
  at: ISODateTime
  actorId: ID
  message: string
  /** Records this event relates to, for per-record history. */
  refs: ID[]
}

/** Derived scheduling bucket for an open commitment. */
export type DueBucket = 'overdue' | 'today' | 'upcoming' | 'undated'
