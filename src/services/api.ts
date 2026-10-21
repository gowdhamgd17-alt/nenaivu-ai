/**
 * Service contract between the UI and a (future) Nenaivu backend.
 *
 * The UI only talks to `NenaivuApi`. Today it is backed by `mockApi`
 * (in-memory, simulated latency, rule-based extraction). Swapping in an HTTP
 * implementation should not require UI changes.
 */
import type {
  ActivityEvent,
  Capture,
  Commitment,
  CommitmentStatus,
  EditableField,
  ID,
  ISODate,
  Memory,
  Person,
  Proposal,
  ProposalFields,
  RecordType,
  Workspace,
  User,
} from '@/types/models'

/** Everything the client may see for ONE workspace. Never mixes workspaces. */
export interface WorkspaceData {
  workspace: Workspace
  people: Person[]
  captures: Capture[]
  proposals: Proposal[]
  memories: Memory[]
  commitments: Commitment[]
  activity: ActivityEvent[]
}

export interface CreateCaptureInput {
  workspaceId: ID
  content: string
  kind: Capture['kind']
  fileName?: string
}

export interface CreateCaptureResult {
  capture: Capture
  proposals: Proposal[]
  activity: ActivityEvent
}

/** Reviewer's final values when approving. Ambiguous deadlines must be resolved here. */
export interface ApprovalInput {
  recordType: RecordType
  title: string
  summary: string
  personId?: ID
  direction: ProposalFields['direction']
  partyKind: ProposalFields['partyKind']
  /** A confirmed date, or null for "no deadline". Never an unresolved phrase. */
  dueDate: ISODate | null
  /** Fields the reviewer changed from the proposal, for the audit trail. */
  editedFields: EditableField[]
}

export interface ApprovalResult {
  proposal: Proposal
  record:
    | { type: 'commitment'; value: Commitment }
    | { type: 'memory'; value: Memory }
    | { type: 'person'; value: Person }
  activity: ActivityEvent
}

export interface RejectionResult {
  proposal: Proposal
  activity: ActivityEvent
}

export interface CommitmentUpdate {
  status?: CommitmentStatus
  dueDate?: ISODate | null
}

export interface CommitmentUpdateResult {
  commitment: Commitment
  activity: ActivityEvent[]
}

export type AskSourceType = 'memory' | 'commitment' | 'person'

/** Language of an Ask answer. Independent of the interface language. */
export type AnswerLanguage = 'en' | 'ta'
/** Reviewer's preference: follow the question's language, or always answer in one language. */
export type AnswerLanguagePreference = 'auto' | AnswerLanguage

export interface AskInput {
  question: string
  responseLanguage: AnswerLanguagePreference
}

/**
 * A confirmed record supporting an answer. Structured, so the UI can label it in the
 * interface language; record titles and summaries stay as written.
 */
export interface AskMatch {
  type: AskSourceType
  id: ID
  title: string
  sourceCaptureId?: ID
  matchedTerms: string[]
  commitment?: { status: CommitmentStatus; dueDate?: ISODate; personName?: string; description: string }
  memory?: { summary: string }
  person?: { kind: 'person' | 'organisation'; role?: string; organisationName?: string }
}

export interface AskResult {
  question: string
  askedAt: string
  /** Language the answer text is written in. */
  language: AnswerLanguage
  /** Whether `language` came from detecting the question or from the user's preference. */
  languageSource: 'detected' | 'preference'
  /** `unsupported` = no confirmed record supports an answer; nothing is guessed. */
  status: 'answered' | 'unsupported'
  /** Answer text in `language`. Stored as returned; never re-translated by the UI. */
  summary: string
  /** Sentence (in `language`) listing parts of the question no record covers. */
  unanswered?: string
  /** Plain text for speech synthesis, in `language`. */
  speechText: string
  matches: AskMatch[]
  /** Question words no confirmed record mentions, as written in the question. */
  unmatchedTerms: string[]
}

export interface NenaivuApi {
  getCurrentUser(): Promise<User>
  listWorkspaces(): Promise<Workspace[]>
  loadWorkspace(workspaceId: ID): Promise<WorkspaceData>
  createCapture(input: CreateCaptureInput): Promise<CreateCaptureResult>
  approveProposal(workspaceId: ID, proposalId: ID, input: ApprovalInput): Promise<ApprovalResult>
  rejectProposal(workspaceId: ID, proposalId: ID, reason?: string): Promise<RejectionResult>
  updateCommitment(workspaceId: ID, commitmentId: ID, update: CommitmentUpdate): Promise<CommitmentUpdateResult>
  ask(workspaceId: ID, input: AskInput): Promise<AskResult>
}

/** Stable error codes; the UI translates them. Messages are for logs only. */
export type ServiceErrorCode =
  | 'forced_failure'
  | 'workspace_not_found'
  | 'capture_empty'
  | 'proposal_not_found'
  | 'already_resolved'
  | 'title_required'
  | 'deadline_unresolved'
  | 'person_not_in_workspace'
  | 'commitment_not_found'
  | 'unknown'

export class ServiceError extends Error {
  readonly code: ServiceErrorCode
  constructor(code: ServiceErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'ServiceError'
    this.code = code
  }
}

export function errorCode(e: unknown): ServiceErrorCode {
  return e instanceof ServiceError ? e.code : 'unknown'
}
