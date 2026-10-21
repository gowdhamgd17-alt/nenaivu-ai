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
  /** Field names the reviewer changed from the proposal, for the audit trail. */
  editedFields: string[]
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

export interface AskMatch {
  type: AskSourceType
  id: ID
  title: string
  detail: string
  sourceCaptureId?: ID
  matchedTerms: string[]
}

export interface AskResult {
  question: string
  askedAt: string
  /** Confirmed records that contain the question's key terms. */
  matches: AskMatch[]
  /** Key terms that no confirmed record mentions. */
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
  ask(workspaceId: ID, question: string): Promise<AskResult>
}

export class ServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}
