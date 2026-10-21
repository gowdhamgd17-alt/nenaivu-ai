import { Check, CircleSlash, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ActivityList } from '@/components/ActivityList'
import { DirectionLabel, DueBadge } from '@/components/badges'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { NotInWorkspace } from '@/components/NotInWorkspace'
import { PageHeader } from '@/components/PageHeader'
import { SourceReference } from '@/components/SourceReference'
import { useToast } from '@/components/Toaster'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { Input } from '@/components/ui/form'
import { WorkspaceView } from '@/components/WorkspaceView'
import { formatDate, formatDateTime } from '@/lib/dates'
import type { WorkspaceData } from '@/services'
import { useAppStore } from '@/store/AppStore'
import { activityFor, findCapture, findPerson, personLabel } from '@/store/selectors'
import type { CommitmentStatus } from '@/types/models'

export function CommitmentDetailPage() {
  return <WorkspaceView>{(data) => <Detail data={data} />}</WorkspaceView>
}

function Detail({ data }: { data: WorkspaceData }) {
  const { id } = useParams()
  const commitment = data.commitments.find((c) => c.id === id)
  const { updateCommitment } = useAppStore()
  const toast = useToast()
  const [confirm, setConfirm] = useState<CommitmentStatus | null>(null)
  const [editingDate, setEditingDate] = useState(false)
  const [dateValue, setDateValue] = useState(commitment?.dueDate ?? '')
  const [savingDate, setSavingDate] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)

  if (!commitment) return <NotInWorkspace kind="commitment" back={{ to: '/commitments', label: 'Back to commitments' }} />

  const capture = findCapture(data, commitment.sourceCaptureId)
  const proposal = commitment.proposalId ? data.proposals.find((p) => p.id === commitment.proposalId) : undefined
  const person = findPerson(data, commitment.personId)

  const statusCopy: Record<CommitmentStatus, { title: string; description: string; label: string; done: string }> = {
    done: { title: 'Mark as done?', description: 'The commitment will move to Completed. You can reopen it later.', label: 'Mark as done', done: 'Marked as done.' },
    cancelled: { title: 'Cancel this commitment?', description: 'Use this when it no longer applies. It stays in history and can be reopened.', label: 'Cancel commitment', done: 'Commitment cancelled.' },
    open: { title: 'Reopen this commitment?', description: 'It will return to your open commitments.', label: 'Reopen', done: 'Commitment reopened.' },
  }

  const saveDate = async (value: string | null) => {
    setSavingDate(true)
    setDateError(null)
    try {
      await updateCommitment(commitment.id, { dueDate: value })
      setEditingDate(false)
      toast({ tone: 'success', message: value ? `Due date set to ${formatDate(value)}.` : 'Due date removed.' })
    } catch (e) {
      setDateError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSavingDate(false)
    }
  }

  return (
    <>
      <PageHeader
        back={{ to: '/commitments', label: 'Commitments' }}
        title={commitment.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DirectionLabel direction={commitment.direction} />
            <span>Confirmed {formatDateTime(commitment.confirmedAt)}</span>
          </span>
        }
        actions={
          commitment.status === 'open' ? (
            <>
              <Button variant="secondary" onClick={() => setConfirm('cancelled')}>
                <CircleSlash aria-hidden /> Cancel
              </Button>
              <Button onClick={() => setConfirm('done')}>
                <Check aria-hidden /> Mark as done
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setConfirm('open')}>
              <RotateCcw aria-hidden /> Reopen
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Details">
            <dl className="divide-y divide-line text-sm">
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
                <dt className="text-ink-muted">Status</dt>
                <dd className="sm:col-span-2">
                  <DueBadge commitment={commitment} />
                </dd>
              </div>
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
                <dt className="text-ink-muted">Due date</dt>
                <dd className="sm:col-span-2">
                  {editingDate ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input type="date" aria-label="Due date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="max-w-48" />
                        <Button size="sm" loading={savingDate} disabled={!dateValue} onClick={() => saveDate(dateValue)}>
                          Save
                        </Button>
                        {commitment.dueDate && (
                          <Button size="sm" variant="ghost" disabled={savingDate} onClick={() => saveDate(null)}>
                            Remove date
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={savingDate} onClick={() => setEditingDate(false)}>
                          Cancel
                        </Button>
                      </div>
                      {dateError && <p role="alert" className="text-xs text-danger">{dateError}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-ink">{commitment.dueDate ? formatDate(commitment.dueDate) : 'Not set — no reminder will be scheduled'}</span>
                      {commitment.status === 'open' && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setDateValue(commitment.dueDate ?? '')
                            setEditingDate(true)
                          }}
                        >
                          {commitment.dueDate ? 'Change' : 'Set date'}
                        </Button>
                      )}
                    </div>
                  )}
                </dd>
              </div>
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
                <dt className="text-ink-muted">Person</dt>
                <dd className="sm:col-span-2">
                  {person ? (
                    <Link to={`/people/${person.id}`} className="font-medium text-primary hover:underline">
                      {personLabel(data, person.id)}
                    </Link>
                  ) : (
                    <span className="text-ink-muted">Not linked</span>
                  )}
                </dd>
              </div>
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
                <dt className="text-ink-muted">Details</dt>
                <dd className="text-ink sm:col-span-2">{commitment.description || <span className="text-ink-muted">None</span>}</dd>
              </div>
              {commitment.completedAt && (
                <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
                  <dt className="text-ink-muted">Completed</dt>
                  <dd className="sm:col-span-2">{formatDateTime(commitment.completedAt)}</dd>
                </div>
              )}
            </dl>
          </SectionCard>

          <SectionCard title="Source" description="The original capture this commitment was confirmed from">
            <div className="p-5">
              <SourceReference capture={capture} highlight={proposal?.sourceExcerpt} />
            </div>
          </SectionCard>
        </div>

        <SectionCard title="History" className="self-start">
          <ActivityList events={activityFor(data, commitment.id)} empty="No changes recorded since confirmation." />
        </SectionCard>
      </div>

      {confirm && (
        <ConfirmationDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={statusCopy[confirm].title}
          description={statusCopy[confirm].description}
          confirmLabel={statusCopy[confirm].label}
          tone={confirm === 'cancelled' ? 'danger' : 'primary'}
          onConfirm={async () => {
            await updateCommitment(commitment.id, { status: confirm })
            toast({ tone: 'success', message: statusCopy[confirm].done })
          }}
        />
      )}
    </>
  )
}
