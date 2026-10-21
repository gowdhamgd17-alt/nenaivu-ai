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
import { serviceErrorText } from '@/i18n/domain'
import { useI18n } from '@/i18n/I18nProvider'
import type { MessageKey } from '@/i18n/messages/en'
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
  const { t, fmt } = useI18n()

  if (!commitment) return <NotInWorkspace kind="commitment" back={{ to: '/commitments', label: t('nav.commitments') }} />

  const capture = findCapture(data, commitment.sourceCaptureId)
  const proposal = commitment.proposalId ? data.proposals.find((p) => p.id === commitment.proposalId) : undefined
  const person = findPerson(data, commitment.personId)

  const statusCopy: Record<CommitmentStatus, { title: MessageKey; description: MessageKey; label: MessageKey; done: MessageKey }> = {
    done: { title: 'commitment.doneTitle', description: 'commitment.doneDesc', label: 'commitment.markDone', done: 'commitment.doneToast' },
    cancelled: { title: 'commitment.cancelTitle', description: 'commitment.cancelDesc', label: 'commitment.cancelConfirm', done: 'commitment.cancelToast' },
    open: { title: 'commitment.reopenTitle', description: 'commitment.reopenDesc', label: 'commitment.reopen', done: 'commitment.reopenToast' },
  }

  const saveDate = async (value: string | null) => {
    setSavingDate(true)
    setDateError(null)
    try {
      await updateCommitment(commitment.id, { dueDate: value })
      setEditingDate(false)
      toast({ tone: 'success', message: value ? t('commitment.dateSetToast', { date: fmt.date(value) }) : t('commitment.dateRemovedToast') })
    } catch (e) {
      setDateError(serviceErrorText(e, t))
    } finally {
      setSavingDate(false)
    }
  }

  return (
    <>
      <PageHeader
        back={{ to: '/commitments', label: t('nav.commitments') }}
        title={commitment.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DirectionLabel direction={commitment.direction} />
            <span>{t('commitment.confirmedAt', { date: fmt.dateTime(commitment.confirmedAt) })}</span>
          </span>
        }
        actions={
          commitment.status === 'open' ? (
            <>
              <Button variant="secondary" onClick={() => setConfirm('cancelled')}>
                <CircleSlash aria-hidden /> {t('commitment.cancel')}
              </Button>
              <Button onClick={() => setConfirm('done')}>
                <Check aria-hidden /> {t('commitment.markDone')}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setConfirm('open')}>
              <RotateCcw aria-hidden /> {t('commitment.reopen')}
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title={t('commitment.details')}>
            <dl className="divide-y divide-line text-sm">
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
                <dt className="text-ink-muted">{t('commitment.status')}</dt>
                <dd className="sm:col-span-2">
                  <DueBadge commitment={commitment} />
                </dd>
              </div>
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
                <dt className="text-ink-muted">{t('commitment.dueDate')}</dt>
                <dd className="sm:col-span-2">
                  {editingDate ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input type="date" aria-label={t('commitment.dueDate')} value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="max-w-48" />
                        <Button size="sm" loading={savingDate} disabled={!dateValue} onClick={() => saveDate(dateValue)}>
                          {t('common.save')}
                        </Button>
                        {commitment.dueDate && (
                          <Button size="sm" variant="ghost" disabled={savingDate} onClick={() => saveDate(null)}>
                            {t('commitment.removeDate')}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={savingDate} onClick={() => setEditingDate(false)}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                      {dateError && <p role="alert" className="text-xs text-danger">{dateError}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-ink">{commitment.dueDate ? fmt.date(commitment.dueDate) : t('commitment.notSet')}</span>
                      {commitment.status === 'open' && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setDateValue(commitment.dueDate ?? '')
                            setEditingDate(true)
                          }}
                        >
                          {commitment.dueDate ? t('common.change') : t('commitment.setDate')}
                        </Button>
                      )}
                    </div>
                  )}
                </dd>
              </div>
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
                <dt className="text-ink-muted">{t('commitment.person')}</dt>
                <dd className="sm:col-span-2">
                  {person ? (
                    <Link to={`/people/${person.id}`} className="font-medium text-primary hover:underline">
                      {personLabel(data, person.id)}
                    </Link>
                  ) : (
                    <span className="text-ink-muted">{t('common.notLinked')}</span>
                  )}
                </dd>
              </div>
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
                <dt className="text-ink-muted">{t('commitment.details')}</dt>
                <dd className="text-ink sm:col-span-2">{commitment.description || <span className="text-ink-muted">{t('common.none')}</span>}</dd>
              </div>
              {commitment.completedAt && (
                <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
                  <dt className="text-ink-muted">{t('commitment.completed')}</dt>
                  <dd className="sm:col-span-2">{fmt.dateTime(commitment.completedAt)}</dd>
                </div>
              )}
            </dl>
          </SectionCard>

          <SectionCard title={t('commitment.source')} description={t('commitment.sourceDesc')}>
            <div className="p-5">
              <SourceReference capture={capture} highlight={proposal?.sourceExcerpt} />
            </div>
          </SectionCard>
        </div>

        <SectionCard title={t('commitment.history')} className="self-start">
          <ActivityList events={activityFor(data, commitment.id)} empty={t('commitment.noChanges')} />
        </SectionCard>
      </div>

      {confirm && (
        <ConfirmationDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={t(statusCopy[confirm].title)}
          description={t(statusCopy[confirm].description)}
          confirmLabel={t(statusCopy[confirm].label)}
          tone={confirm === 'cancelled' ? 'danger' : 'primary'}
          onConfirm={async () => {
            await updateCommitment(commitment.id, { status: confirm })
            toast({ tone: 'success', message: t(statusCopy[confirm].done) })
          }}
        />
      )}
    </>
  )
}
