import { CheckCircle2, Inbox, MousePointerClick, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CaptureTabs } from '@/components/CaptureTabs'
import { PageHeader } from '@/components/PageHeader'
import { ReviewProposalCard } from '@/components/ReviewProposalCard'
import { EmptyState, LoadingState, Notice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WorkspaceView } from '@/components/WorkspaceView'
import { useI18n } from '@/i18n/I18nProvider'
import type { MessageKey } from '@/i18n/messages/en'
import { cn } from '@/lib/utils'
import type { WorkspaceData } from '@/services'
import { personLabel } from '@/store/selectors'
import type { Proposal } from '@/types/models'
import { ProposalReview } from './ProposalReview'

type TypeFilter = 'all' | 'commitment' | 'person'
type StatusFilter = 'pending' | 'resolved'

const TYPE_FILTERS: { value: TypeFilter; labelKey: MessageKey }[] = [
  { value: 'all', labelKey: 'review.filterAll' },
  { value: 'commitment', labelKey: 'review.filterCommitments' },
  { value: 'person', labelKey: 'review.filterPeople' },
]

function useIsDesktop() {
  const query = '(min-width: 1024px)'
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const fn = () => setMatch(mql.matches)
    mql.addEventListener('change', fn)
    return () => mql.removeEventListener('change', fn)
  }, [])
  return match
}

export function ReviewInboxPage() {
  const { t } = useI18n()
  return (
    <>
      <PageHeader title={t('nav.capture')} description={t('review.desc')} />
      <CaptureTabs />
      <WorkspaceView
        loading={
          <Card>
            <LoadingState label={t('review.loading')} rows={5} />
          </Card>
        }
      >
        {(data) => <Inbox_ data={data} />}
      </WorkspaceView>
    </>
  )
}

function Inbox_({ data }: { data: WorkspaceData }) {
  const { proposalId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const { t, fmt } = useI18n()

  const type = (params.get('type') as TypeFilter) || 'all'
  const statusFilter = (params.get('status') as StatusFilter) || 'pending'
  const captureId = params.get('capture')
  const capturedCount = (location.state as { capturedCount?: number } | null)?.capturedCount

  const matchesType = (p: Proposal) => type === 'all' || p.recordType === type
  const list = useMemo(
    () =>
      data.proposals
        .filter((p) => (statusFilter === 'pending' ? p.status === 'pending' : p.status !== 'pending'))
        .filter(matchesType)
        .sort((a, b) => {
          // Proposals from the capture just made come first.
          if (captureId) {
            const ac = a.captureId === captureId ? 0 : 1
            const bc = b.captureId === captureId ? 0 : 1
            if (ac !== bc) return ac - bc
          }
          return (statusFilter === 'pending' ? b.createdAt.localeCompare(a.createdAt) : (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.proposals, statusFilter, type, captureId],
  )

  const counts = useMemo(() => {
    const pending = data.proposals.filter((p) => p.status === 'pending')
    return {
      all: pending.length,
      commitment: pending.filter((p) => p.recordType === 'commitment').length,
      person: pending.filter((p) => p.recordType === 'person').length,
    }
  }, [data.proposals])

  const selected = proposalId ? data.proposals.find((p) => p.id === proposalId) : undefined
  const qs = params.toString() ? `?${params.toString()}` : ''
  const linkFor = (id: string) => `/capture/review/${id}${qs}`

  // Desktop: open the first proposal automatically so the detail pane is never empty.
  useEffect(() => {
    if (isDesktop && !proposalId && list[0]) navigate(linkFor(list[0].id), { replace: true, state: location.state })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, proposalId, list])

  const setFilter = (key: 'type' | 'status', value: string) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    next.delete('capture')
    navigate(`/capture/review?${next.toString()}`)
  }

  const onResolved = (id: string) => {
    const idx = list.findIndex((p) => p.id === id)
    const rest = list.filter((p) => p.id !== id)
    const nextItem = statusFilter === 'pending' ? (rest[idx] ?? rest[idx - 1]) : undefined
    navigate(nextItem ? linkFor(nextItem.id) : `/capture/review${qs}`)
  }

  const captureBanner = captureId && capturedCount !== undefined && (
    <Notice
      tone={capturedCount > 0 ? 'success' : 'neutral'}
      icon={<CheckCircle2 />}
      title={t('review.savedTitle')}
      className="mb-4"
      action={
        <button onClick={() => setParams((p) => (p.delete('capture'), p), { replace: true })} aria-label={t('common.dismiss')} className="text-ink-faint hover:text-ink">
          <X className="size-4" />
        </button>
      }
    >
      {capturedCount > 0 ? t('review.savedSome', { count: capturedCount }) : t('review.savedNone')}
    </Notice>
  )

  const showList = isDesktop || !proposalId
  const showDetail = isDesktop || !!proposalId

  // Proposal not found (e.g. stale link after switching workspace)
  if (proposalId && !selected) {
    return (
      <Card>
        <EmptyState
          icon={<Inbox />}
          title={t('review.notFoundTitle')}
          description={t('review.notFoundDesc')}
          action={
            <Button asChild variant="secondary" size="sm">
              <Link to="/capture/review">{t('review.backToInbox')}</Link>
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <>
      {captureBanner}
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        {showList && (
          <Card className="overflow-hidden lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]">
            <div className="space-y-3 border-b border-line p-3">
              <div role="group" aria-label={t('review.filterType')} className="flex gap-1 overflow-x-auto">
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter('type', f.value)}
                    aria-pressed={type === f.value}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-input px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                      type === f.value ? 'bg-ink text-white' : 'text-ink-muted hover:bg-subtle hover:text-ink',
                    )}
                  >
                    {t(f.labelKey)}
                    {statusFilter === 'pending' && <span className={cn('tabular text-xs', type === f.value ? 'text-white/70' : 'text-ink-faint')}>{fmt.number(counts[f.value])}</span>}
                  </button>
                ))}
              </div>
              <div role="group" aria-label={t('review.filterStatus')} className="grid grid-cols-2 rounded-input bg-subtle p-0.5 text-xs font-medium">
                {(['pending', 'resolved'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter('status', s)}
                    aria-pressed={statusFilter === s}
                    className={cn('rounded-[6px] py-1.5 transition-colors', statusFilter === s ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink')}
                  >
                    {s === 'pending' ? t('review.awaiting') : t('review.resolved')}
                  </button>
                ))}
              </div>
            </div>
            {list.length === 0 ? (
              statusFilter === 'pending' ? (
                <EmptyState
                  compact
                  icon={<CheckCircle2 />}
                  title={type === 'all' ? t('review.allCaught') : type === 'person' ? t('review.nonePeople') : t('review.noneCommitment')}
                  description={t('review.newWillAppear')}
                  action={
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/capture/new">
                        <Plus aria-hidden /> {t('review.newCapture')}
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <EmptyState compact icon={<Inbox />} title={t('review.nothingResolved')} description={t('review.nothingResolvedDesc')} />
              )
            ) : (
              <ul className="max-h-[calc(100dvh-280px)] divide-y divide-line overflow-y-auto" aria-label={t('review.listLabel')}>
                {list.map((p) => (
                  <ReviewProposalCard key={p.id} proposal={p} personLabel={personLabel(data, p.fields.personId)} to={linkFor(p.id)} selected={p.id === proposalId} />
                ))}
              </ul>
            )}
          </Card>
        )}

        {showDetail && (
          <Card className="min-w-0 overflow-clip">
            {selected ? (
              <>
                {!isDesktop && (
                  <div className="border-b border-line px-5 py-3">
                    <Link to={`/capture/review${qs}`} className="text-sm font-medium text-primary hover:underline">
                      ← {t('review.backToList')}
                    </Link>
                  </div>
                )}
                <ProposalReview key={selected.id + selected.status} proposal={selected} data={data} onResolved={onResolved} />
              </>
            ) : (
              <EmptyState
                icon={list.length ? <MousePointerClick /> : <CheckCircle2 />}
                title={list.length ? t('review.selectTitle') : t('review.emptyTitle')}
                description={list.length ? t('review.selectDesc') : t('review.emptyDesc')}
              />
            )}
          </Card>
        )}
      </div>
    </>
  )
}
