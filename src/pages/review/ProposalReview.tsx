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
import { captureSourceLabel, deadlineReasonText, serviceErrorText, uncertaintyText } from '@/i18n/domain'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import type { ApprovalInput, WorkspaceData } from '@/services'
import { useAppStore } from '@/store/AppStore'
import { findCapture, personLabel } from '@/store/selectors'
import type { CommitmentDirection, EditableField, PartyKind, Proposal, RecordType } from '@/types/models'

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
  const { t, tx, fmt } = useI18n()

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

  const titleError = showErrors && !draft.title.trim() ? t('proposal.titleRequired') : undefined
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const editedFields = (): EditableField[] => {
    const labels: Partial<Record<keyof Draft, EditableField>> = {
      recordType: 'type',
      title: 'title',
      summary: draft.recordType === 'person' ? 'role' : 'details',
      personId: 'person',
      direction: 'direction',
      partyKind: 'contactType',
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
      setError(needsDateResolution ? t('proposal.resolveDate') : dateMissing ? t('proposal.pickDate') : t('proposal.fixFields'))
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
      toast({ tone: 'success', message: t('proposal.approvedToast', { recordType: t(`recordLower.${result.record.type}`) }), link: { to, label: t('common.openRecord') } })
      onResolved(proposal.id)
    } catch (e) {
      setError(serviceErrorText(e, t))
    } finally {
      setSubmitting(false)
    }
  }

  const reject = async (reason: string) => {
    await rejectProposal(proposal.id, reason)
    toast({ tone: 'neutral', message: t('proposal.rejectedToast') })
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
          {proposal.status === 'pending' && <StatusBadge>{t('badge.awaiting')}</StatusBadge>}
          {proposal.status === 'approved' && <StatusBadge tone="success" icon={<Check />}>{t('badge.approved')}</StatusBadge>}
          {proposal.status === 'rejected' && <StatusBadge icon={<X />}>{t('badge.rejected')}</StatusBadge>}
        </div>
        <h2 id={`${uid}-h`} className="mt-2 text-lg font-semibold text-ink">
          {proposal.fields.title}
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">{t('proposal.proposedFrom', { date: fmt.dateTime(proposal.createdAt), source: captureSourceLabel(capture, t) })}</p>
      </header>

      <div className="flex-1 space-y-6 px-5 py-5 sm:px-6">
        {proposal.status === 'approved' && (
          <Notice tone="success" icon={<Check />} title={t('proposal.approvedAt', { date: proposal.resolvedAt ? fmt.dateTime(proposal.resolvedAt) : '' })}>
            {t('proposal.recordCreated')}{' '}
            {resultingLink && (
              <Link to={resultingLink} className="font-medium text-primary hover:underline">
                {t('common.openRecord')}
              </Link>
            )}
          </Notice>
        )}
        {proposal.status === 'rejected' && (
          <Notice tone="neutral" icon={<CircleSlash />} title={t('proposal.rejectedAt', { date: proposal.resolvedAt ? fmt.dateTime(proposal.resolvedAt) : '' })}>
            {t('proposal.noRecord')}
            {proposal.rejectionReason && <> {t('proposal.reason', { reason: proposal.rejectionReason })}</>}
          </Notice>
        )}

        <section aria-label={t('source.original')}>
          <SourceReference capture={capture} highlight={proposal.sourceExcerpt} />
          <p className="mt-1.5 text-xs text-ink-muted">{t('proposal.highlightNote')}</p>
        </section>

        {pending && duplicate && (
          <Notice tone="warning" icon={<AlertCircle />} title={t('proposal.duplicateTitle')}>
            {tx('proposal.duplicateText', { title: duplicate.title }, {
              link: (c) => (
                <Link to={duplicate.to} className="font-medium text-primary hover:underline">
                  {c}
                </Link>
              ),
            })}
            {'commitment' in duplicate && duplicate.commitment && (
              <span className="mt-1.5 block">
                <DueBadge commitment={duplicate.commitment} />
              </span>
            )}
          </Notice>
        )}

        {pending && proposal.uncertainties.length > 0 && (
          <section aria-labelledby={`${uid}-unc`} className="rounded-input border border-line bg-canvas px-4 py-3">
            <h3 id={`${uid}-unc`} className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <HelpCircle className="size-4 text-ink-muted" aria-hidden /> {t('proposal.checkTitle')}
            </h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-muted marker:text-ink-faint">
              {proposal.uncertainties.map((u, i) => (
                <li key={`${u.code}-${i}`}>{uncertaintyText(u, t)}</li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby={`${uid}-fields`} className="space-y-4">
          <div>
            <h3 id={`${uid}-fields`} className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Sparkles className="size-4 text-primary" aria-hidden /> {t('proposal.proposedRecord')}
            </h3>
            <p className="text-xs text-ink-muted">{pending ? t('proposal.draftedHint') : t('proposal.historicHint')}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${uid}-type`} label={t('proposal.recordType')}>
              <Select id={`${uid}-type`} value={draft.recordType} disabled={fieldsDisabled} onChange={(e) => set('recordType', e.target.value as RecordType)}>
                <option value="commitment">{t('record.commitment')}</option>
                <option value="memory">{t('record.memory')}</option>
                <option value="person">{t('proposal.typeContact')}</option>
              </Select>
            </Field>
            {draft.recordType === 'person' ? (
              <Field id={`${uid}-kind`} label={t('proposal.contactType')}>
                <Select id={`${uid}-kind`} value={draft.partyKind} disabled={fieldsDisabled} onChange={(e) => set('partyKind', e.target.value as PartyKind)}>
                  <option value="person">{t('record.person')}</option>
                  <option value="organisation">{t('record.organisation')}</option>
                </Select>
              </Field>
            ) : (
              <Field
                id={`${uid}-person`}
                label={t('proposal.personOrOrg')}
                hint={!draft.personId && proposal.fields.personName ? t('proposal.unmatchedName', { name: proposal.fields.personName }) : undefined}
              >
                <Select id={`${uid}-person`} value={draft.personId} disabled={fieldsDisabled} onChange={(e) => set('personId', e.target.value)}>
                  <option value="">{t('common.notLinked')}</option>
                  {data.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(data, p.id)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          <Field id={`${uid}-title`} label={draft.recordType === 'person' ? t('proposal.name') : t('proposal.title')} error={titleError}>
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

          <Field
            id={`${uid}-summary`}
            label={draft.recordType === 'person' ? t('proposal.roleNotes') : draft.recordType === 'memory' ? t('proposal.whatToRemember') : t('proposal.details')}
            hint={t('common.optional')}
          >
            {draft.recordType === 'person' ? (
              <Input id={`${uid}-summary`} value={draft.summary} disabled={fieldsDisabled} onChange={(e) => set('summary', e.target.value)} maxLength={140} />
            ) : (
              <Textarea id={`${uid}-summary`} value={draft.summary} disabled={fieldsDisabled} onChange={(e) => set('summary', e.target.value)} rows={3} maxLength={1000} />
            )}
          </Field>

          {isCommitment && (
            <>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-ink">{t('proposal.direction')}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['we_owe', <ArrowUpRight key="u" />],
                      ['owed_to_us', <ArrowDownLeft key="d" />],
                    ] as const
                  ).map(([value, icon]) => (
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
                        <span className="block font-medium text-ink">{t(`direction.${value}`)}</span>
                        <span className="block text-xs text-ink-muted">{t(`direction.${value}Hint`)}</span>
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
            <X aria-hidden /> {t('proposal.reject')}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {needsDateResolution && <span className="text-xs text-warning">{t('proposal.resolveToApprove')}</span>}
            <Button onClick={approve} loading={submitting}>
              {!submitting && <Check aria-hidden />} {t('proposal.approve')}
            </Button>
          </div>
        </footer>
      )}

      <ConfirmationDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t('proposal.rejectTitle')}
        description={t('proposal.rejectDesc')}
        confirmLabel={t('proposal.rejectConfirm')}
        tone="danger"
        reasonLabel={t('proposal.reasonLabel')}
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
  const { t, tx, fmt } = useI18n()

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
        <legend className="sr-only">{t('proposal.deadlineLegend')}</legend>
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <CalendarClock className="size-4 text-warning" aria-hidden /> {t('proposal.deadlineUnclear')}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {tx('proposal.deadlineSays', { phrase: deadline.phrase, reason: deadlineReasonText(deadline.reason, t, fmt) }, { b: (c) => <strong className="font-medium text-ink">{c}</strong> })}
        </p>
        <div className="mt-3 space-y-2.5">
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="radio" name={`${uid}-dl`} checked={choice === 'date'} disabled={disabled} onChange={() => onChange('date', dueDate)} className="size-4 accent-primary" />
            {t('proposal.setDate')}
          </label>
          {choice === 'date' && (
            <div className="pl-6.5">
              <Input type="date" id={dateId} aria-label={t('proposal.dueDate')} value={dueDate} disabled={disabled} onChange={(e) => onChange('date', e.target.value)} className="max-w-48" aria-invalid={showErrors && !dueDate} />
            </div>
          )}
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="radio" name={`${uid}-dl`} checked={choice === 'none'} disabled={disabled} onChange={() => onChange('none', '')} className="size-4 accent-primary" />
            {t('proposal.noDate')}
          </label>
        </div>
      </fieldset>
    )
  }

  return (
    <Field
      id={dateId}
      label={t('proposal.dueDate')}
      hint={
        deadline.kind === 'exact'
          ? [t('proposal.fromSource', { phrase: deadline.phrase }), deadline.note && uncertaintyText(deadline.note, t)].filter(Boolean).join(' — ')
          : t('proposal.noDeadlineHint')
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
            {t('common.clear')}
          </Button>
        )}
        {dueDate && <span className="hidden text-xs text-ink-muted sm:inline">{fmt.date(dueDate)}</span>}
      </div>
    </Field>
  )
}
