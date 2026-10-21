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
  /** Verified mobile number in E.164 form, e.g. +919876543210. */
  phone?: string
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
export type CaptureChannel = 'quick_capture' | 'file'

export interface Capture {
  id: ID
  workspaceId: ID
  kind: CaptureKind
  /** Original text exactly as entered or read from the file. */
  content: string
  fileName?: string
  /** Where it came from. Rendered through the UI dictionary, never stored as display text. */
  channel: CaptureChannel
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
  | { kind: 'exact'; date: ISODate; phrase: string; note?: Uncertainty }
  | { kind: 'ambiguous'; phrase: string; reason: DeadlineReason }

/**
 * Machine-readable explanation of why a proposal needs checking. The service returns
 * codes and parameters; the UI renders them in the interface language.
 * `phrase` / `name` params are quoted from the source and are never translated.
 */
export type UncertaintyCode =
  | 'name_matched'
  | 'name_only_match'
  | 'name_ambiguous'
  | 'pronoun_assumed'
  | 'not_confirmed_contact'
  | 'direction_unclear'
  | 'no_deadline'
  | 'year_assumed'
  | 'resolved_today'
  | 'resolved_tomorrow'
  | 'counted_days'
  | 'combined_sentences'
  | 'org_detected'
  | 'person_detected'
  | 'role_unknown'
  | 'non_english_note'

export interface Uncertainty {
  code: UncertaintyCode
  params?: Record<string, string | number>
}

export type DeadlineReason =
  | { code: 'weekday'; weekday: number } // 0 = Monday … 6 = Sunday
  | { code: 'month_end' | 'week_end' | 'no_day' | 'not_a_date' }

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
  /** Reasons the reviewer should double-check. Explained in words, never as percentages. */
  uncertainties: Uncertainty[]
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

/**
 * Structured details for an activity event. Titles, file names and reasons are
 * user content and shown as written; everything else is rendered by the UI.
 */
export interface ActivityParams {
  captureKind?: CaptureKind
  fileName?: string
  proposalCount?: number
  recordType?: RecordType
  title?: string
  /** Field codes the reviewer changed when approving. */
  editedFields?: EditableField[]
  reason?: string
  from?: CommitmentStatus
  to?: CommitmentStatus
  date?: ISODate
}

export type EditableField = 'type' | 'title' | 'details' | 'role' | 'person' | 'direction' | 'contactType' | 'deadline'

export interface ActivityEvent {
  id: ID
  workspaceId: ID
  type: ActivityType
  at: ISODateTime
  actorId: ID
  params: ActivityParams
  /** Records this event relates to, for per-record history. */
  refs: ID[]
}

/** Derived scheduling bucket for an open commitment. */
export type DueBucket = 'overdue' | 'today' | 'upcoming' | 'undated'
