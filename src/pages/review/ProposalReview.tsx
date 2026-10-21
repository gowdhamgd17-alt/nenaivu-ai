import { AlertCircle, ArrowDownLeft, ArrowUpRight, Check, CircleSlash, CalendarClock, HelpCircle, Sparkles, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DueBadge, RecordTypeBadge } from '@/components/badges'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { SourceReference } from '@/components/SourceReference'
import { Notice } from '@/components/states'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/components/Toaster'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { formatDate, formatDateTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { ApprovalInput, WorkspaceData } from '@/services'
import { useAppStore } from '@/store/AppStore'
import { findCapture, personLabel } from '@/store/selectors'
import type { CommitmentDirection, PartyKind, Proposal, RecordType } from '@/types/models'

interface ProposalReviewProps {
  proposal: Proposal
  data: WorkspaceData
  /** Called after approve / reject with the id of the resolved proposal. */
  onResolved: (proposalId: string) => void
}

type DeadlineChoice = 'date' | 'none' | 'unset'

interface Draft {
  recordType: RecordType
  title: string
  summary: string
  personId: string
  direction: CommitmentDirection
  partyKind: PartyKind
  deadlineChoice: DeadlineChoice
  dueDate: string
}

function initialDraft(p: Proposal): Draft {
  const d = p.fields.deadline
  return {
    recordType: p.recordType,
    title: p.fields.title,
    summary: p.fields.summary,
    personId: p.fields.personId ?? '',
    direction: p.fields.direction,
    partyKind: p.fields.partyKind,
    deadlineChoice: d.kind === 'exact' ? 'date' : d.kind === 'none' ? 'none' : 'unset',
    dueDate: d.kind === 'exact' ? d.date : '',
  }
}

export function ProposalReview({ proposal, data, onResolved }: ProposalReviewProps) {
  // Keyed by proposal id in the parent, so draft resets per proposal.
  const [draft, setDraft] = useState<Draft>(() => initialDraft(proposal))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const { approveProposal, rejectProposal } = useAppStore()
  const toast = useToast()
  const uid = useId()

  const capture = findCapture(data, proposal.captureId)
  const pending = proposal.status === 'pending'
  const original = useMemo(() => initialDraft(proposal), [proposal])
  const deadline = proposal.fields.deadline
  const isCommitment = draft.recordType === 'commitment'
  const needsDateResolution = isCommitment && draft.deadlineChoice === 'unset'
  const dateMissing = isCommitment && draft.deadlineChoice === 'date' && !draft.dueDate

  const duplicate = useMemo(() => {
    const d = proposal.possibleDuplicateOf
    if (!d) return null
    if (d.recordType === 'commitment') {
      const c = data.commitments.find((x) => x.id === d.id)
      return c ? { title: c.title, to: `/commitments/${c.id}`, commitment: c } : null
    }
    if (d.recordType === 'memory') {
      const m = data.memories.find((x) => x.id === d.id)
      return m ? { title: m.title, to: `/memory/${m.id}` } : null
    }
    const p = data.people.find((x) => x.id === d.id)
    return p ? { title: p.name, to: `/people/${p.id}` } : null
  }, [proposal.possibleDuplicateOf, data])

  const titleError = showErrors && !draft.title.trim() ? 'A title is required.' : undefined
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const editedFields = (): string[] => {
    const labels: Partial<Record<keyof Draft, string>> = {
      recordType: 'type',
      title: 'title',
      summary: draft.recordType === 'person' ? 'role' : 'details',
      personId: 'person',
      direction: 'direction',
      partyKind: 'contact type',
      dueDate: 'deadline',
    }
    return (Object.keys(labels) as (keyof Draft)[]).filter((k) => {
      if (k === 'dueDate') return isCommitment && (draft.deadlineChoice !== original.deadlineChoice || draft.dueDate !== original.dueDate)
      return draft[k] !== original[k]
    }).map((k) => labels[k]!)
  }

  const approve = async () => {
    setShowErrors(true)
    if (!draft.title.trim() || needsDateResolution || dateMissing) {
      setError(needsDateResolution ? 'Choose a date or confirm there is no due date before approving.' : dateMissing ? 'Pick a due date, or choose “No due date”.' : 'Fix the highlighted fields.')
      return
    }
    setSubmitting(true)
    setError(null)
    const input: ApprovalInput = {
      recordType: draft.recordType,
      title: draft.title,
      summary: draft.summary,
      personId: draft.recordType === 'person' ? undefined : draft.personId || undefined,
      direction: draft.direction,
      partyKind: draft.partyKind,
      dueDate: isCommitment && draft.deadlineChoice === 'date' ? draft.dueDate : null,
      editedFields: editedFields(),
    }
    try {
      const result = await approveProposal(proposal.id, input)
      const to =
        result.record.type === 'commitment' ? `/commitments/${result.record.value.id}` : result.record.type === 'memory' ? `/memory/${result.record.value.id}` : `/people/${result.record.value.id}`
      toast({ tone: 'success', message: `Approved — saved as a confirmed ${result.record.type === 'person' ? 'contact' : result.record.type}.`, link: { to, label: 'Open record' } })
      onResolved(proposal.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const reject = async (reason: string) => {
    await rejectProposal(proposal.id, reason)
    toast({ tone: 'neutral', message: 'Proposal rejected. No record was created.' })
    onResolved(proposal.id)
  }

  const resultingLink = (() => {
    const id = proposal.resultingRecordId
    if (!id) return null
    if (data.commitments.some((c) => c.id === id)) return `/commitments/${id}`
    if (data.memories.some((m) => m.id === id)) return `/memory/${id}`
    if (data.people.some((p) => p.id === id)) return `/people/${id}`
    return null
  })()

  const fieldsDisabled = !pending || submitting

  return (
    <article aria-labelledby={`${uid}-h`} className="flex h-full flex-col">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <RecordTypeBadge type={proposal.recordType} partyKind={proposal.fields.partyKind} />
          {proposal.status === 'pending' && <StatusBadge>Awaiting confirmation</StatusBadge>}
          {proposal.status === 'approved' && <StatusBadge tone="success" icon={<Check />}>Approved</StatusBadge>}
          {proposal.status === 'rejected' && <StatusBadge icon={<X />}>Rejected</StatusBadge>}
        </div>
        <h2 id={`${uid}-h`} className="mt-2 text-lg font-semibold text-ink">
          {proposal.fields.title}
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">Proposed {formatDateTime(proposal.createdAt)} from {capture?.fileName ?? capture?.channel ?? 'a capture'}</p>
      </header>

      <div className="flex-1 space-y-6 px-5 py-5 sm:px-6">
        {proposal.status === 'approved' && (
          <Notice tone="success" icon={<Check />} title={`Approved ${proposal.resolvedAt ? formatDateTime(proposal.resolvedAt) : ''}`}>
            A confirmed record was created.{' '}
            {resultingLink && (
              <Link to={resultingLink} className="font-medium text-primary hover:underline">
                Open record
              </Link>
            )}
          </Notice>
        )}
        {proposal.status === 'rejected' && (
          <Notice tone="neutral" icon={<CircleSlash />} title={`Rejected ${proposal.resolvedAt ? formatDateTime(proposal.resolvedAt) : ''}`}>
            No record was created.{proposal.rejectionReason && <> Reason: “{proposal.rejectionReason}”</>}
          </Notice>
        )}

        <section aria-label="Original source">
          <SourceReference capture={capture} highlight={proposal.sourceExcerpt} />
          <p className="mt-1.5 text-xs text-ink-muted">Highlighted text is what this proposal was drafted from. The original cannot be edited.</p>
        </section>

        {pending && duplicate && (
          <Notice tone="warning" icon={<AlertCircle />} title="Possible duplicate">
            This looks similar to an existing record:{' '}
            <Link to={duplicate.to} className="font-medium text-primary hover:underline">
              {duplicate.title}
            </Link>
            {'commitment' in duplicate && duplicate.commitment && (
              <span className="ml-1.5 inline-block align-middle">
                <DueBadge commitment={duplicate.commitment} />
              </span>
            )}
            . If it is the same thing, reject this proposal.
          </Notice>
        )}

        {pending && proposal.uncertainties.length > 0 && (
          <section aria-labelledby={`${uid}-unc`} className="rounded-input border border-line bg-canvas px-4 py-3">
            <h3 id={`${uid}-unc`} className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <HelpCircle className="size-4 text-ink-muted" aria-hidden /> Check before approving
            </h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-muted marker:text-ink-faint">
              {proposal.uncertainties.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby={`${uid}-fields`} className="space-y-4">
          <div>
            <h3 id={`${uid}-fields`} className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Sparkles className="size-4 text-primary" aria-hidden /> Proposed record
            </h3>
            <p className="text-xs text-ink-muted">{pending ? 'Drafted from the source — edit anything before approving.' : 'Values at the time of proposal.'}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${uid}-type`} label="Record type">
              <Select id={`${uid}-type`} value={draft.recordType} disabled={fieldsDisabled} onChange={(e) => set('recordType', e.target.value as RecordType)}>
                <option value="commitment">Commitment</option>
                <option value="memory">Memory</option>
                <option value="person">Contact (person or organisation)</option>
              </Select>
            </Field>
            {draft.recordType === 'person' ? (
              <Field id={`${uid}-kind`} label="Contact type">
                <Select id={`${uid}-kind`} value={draft.partyKind} disabled={fieldsDisabled} onChange={(e) => set('partyKind', e.target.value as PartyKind)}>
                  <option value="person">Person</option>
                  <option value="organisation">Organisation</option>
                </Select>
              </Field>
            ) : (
              <Field
                id={`${uid}-person`}
                label="Person or organisation"
                hint={!draft.personId && proposal.fields.personName ? `“${proposal.fields.personName}” is mentioned but not a confirmed contact yet.` : undefined}
              >
                <Select id={`${uid}-person`} value={draft.personId} disabled={fieldsDisabled} onChange={(e) => set('personId', e.target.value)}>
                  <option value="">Not linked</option>
                  {data.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(data, p.id)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          <Field id={`${uid}-title`} label={draft.recordType === 'person' ? 'Name' : 'Title'} error={titleError}>
            <Input
              id={`${uid}-title`}
              value={draft.title}
              disabled={fieldsDisabled}
              maxLength={140}
              onChange={(e) => set('title', e.target.value)}
              aria-invalid={!!titleError}
              aria-describedby={titleError ? `${uid}-title-error` : undefined}
            />
          </Field>

          <Field id={`${uid}-summary`} label={draft.recordType === 'person' ? 'Role or notes' : draft.recordType === 'memory' ? 'What to remember' : 'Details'} hint="Optional">
            {draft.recordType === 'person' ? (
              <Input id={`${uid}-summary`} value={draft.summary} disabled={fieldsDisabled} onChange={(e) => set('summary', e.target.value)} maxLength={140} />
            ) : (
              <Textarea id={`${uid}-summary`} value={draft.summary} disabled={fieldsDisabled} onChange={(e) => set('summary', e.target.value)} rows={3} maxLength={1000} />
            )}
          </Field>

          {isCommitment && (
            <>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-ink">Direction</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['we_owe', 'We owe', 'We promised this', <ArrowUpRight key="u" />],
                      ['owed_to_us', 'Owed to us', 'Someone promised us', <ArrowDownLeft key="d" />],
                    ] as const
                  ).map(([value, label, hint, icon]) => (
                    <label
                      key={value}
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-input border px-3 py-2.5 text-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/15 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:text-ink-muted',
                        draft.direction === value ? 'border-primary bg-primary-soft/50' : 'border-line',
                        fieldsDisabled && 'cursor-not-allowed opacity-70',
                      )}
                    >
                      <input type="radio" name={`${uid}-dir`} value={value} checked={draft.direction === value} disabled={fieldsDisabled} onChange={() => set('direction', value)} className="sr-only" />
                      {icon}
                      <span>
                        <span className="block font-medium text-ink">{label}</span>
                        <span className="block text-xs text-ink-muted">{hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <DeadlineEditor
                uid={uid}
                deadline={deadline}
                choice={draft.deadlineChoice}
                dueDate={draft.dueDate}
                disabled={fieldsDisabled}
                showErrors={showErrors}
                onChange={(choice, date) => setDraft((d) => ({ ...d, deadlineChoice: choice, dueDate: date }))}
              />
            </>
          )}
        </section>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      {pending && (
        <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button variant="danger-outline" onClick={() => setRejectOpen(true)} disabled={submitting}>
            <X aria-hidden /> Reject
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {needsDateResolution && <span className="text-xs text-warning">Resolve the deadline to approve</span>}
            <Button onClick={approve} loading={submitting}>
              {!submitting && <Check aria-hidden />} Approve & save
            </Button>
          </div>
        </footer>
      )}

      <ConfirmationDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this proposal?"
        description="It will be marked as rejected and no record will be created. The original capture is kept."
        confirmLabel="Reject proposal"
        tone="danger"
        reasonLabel="Reason"
        onConfirm={reject}
      />
    </article>
  )
}

interface DeadlineEditorProps {
  uid: string
  deadline: Proposal['fields']['deadline']
  choice: DeadlineChoice
  dueDate: string
  disabled: boolean
  showErrors: boolean
  onChange: (choice: DeadlineChoice, date: string) => void
}

function DeadlineEditor({ uid, deadline, choice, dueDate, disabled, showErrors, onChange }: DeadlineEditorProps) {
  const dateId = `${uid}-due`

  if (deadline.kind === 'ambiguous') {
    const unresolved = choice === 'unset'
    return (
      <fieldset
        className={cn(
          'rounded-input border px-4 py-3.5',
          unresolved ? 'border-warning/40 bg-warning-soft' : 'border-line',
          unresolved && showErrors && 'ring-3 ring-warning/20',
        )}
      >
        <legend className="sr-only">Deadline</legend>
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <CalendarClock className="size-4 text-warning" aria-hidden /> Deadline needs clarification
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          The source says <strong className="font-medium text-ink">“{deadline.phrase}”</strong>. {deadline.reason} No reminder will be scheduled until you choose.
        </p>
        <div className="mt-3 space-y-2.5">
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="radio" name={`${uid}-dl`} checked={choice === 'date'} disabled={disabled} onChange={() => onChange('date', dueDate)} className="size-4 accent-primary" />
            Set a specific date
          </label>
          {choice === 'date' && (
            <div className="pl-6.5">
              <Input type="date" id={dateId} aria-label="Due date" value={dueDate} disabled={disabled} onChange={(e) => onChange('date', e.target.value)} className="max-w-48" aria-invalid={showErrors && !dueDate} />
            </div>
          )}
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="radio" name={`${uid}-dl`} checked={choice === 'none'} disabled={disabled} onChange={() => onChange('none', '')} className="size-4 accent-primary" />
            Save without a due date
          </label>
        </div>
      </fieldset>
    )
  }

  return (
    <Field
      id={dateId}
      label="Due date"
      hint={
        deadline.kind === 'exact'
          ? `From the source: “${deadline.phrase}”${deadline.note ? ` — ${deadline.note}` : ''}`
          : 'No deadline was mentioned in the source. Leave empty unless you know the date.'
      }
    >
      <div className="flex items-center gap-2">
        <Input
          type="date"
          id={dateId}
          value={dueDate}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value ? 'date' : 'none', e.target.value)}
          className="max-w-48"
          aria-describedby={`${dateId}-hint`}
        />
        {dueDate && !disabled && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('none', '')}>
            Clear
          </Button>
        )}
        {dueDate && <span className="hidden text-xs text-ink-muted sm:inline">{formatDate(dueDate)}</span>}
      </div>
    </Field>
  )
}
