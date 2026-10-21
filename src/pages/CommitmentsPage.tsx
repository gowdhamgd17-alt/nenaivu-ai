import { ListChecks, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CommitmentRow } from '@/components/CommitmentRow'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/form'
import { WorkspaceView } from '@/components/WorkspaceView'
import { useI18n } from '@/i18n/I18nProvider'
import { dueBucket } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { WorkspaceData } from '@/services'
import { byDueDate, personLabel } from '@/store/selectors'
import type { Commitment } from '@/types/models'

const VIEWS = [
  { value: 'open', labelKey: 'view.open' },
  { value: 'overdue', labelKey: 'view.overdue' },
  { value: 'today', labelKey: 'view.today' },
  { value: 'upcoming', labelKey: 'view.upcoming' },
  { value: 'undated', labelKey: 'view.undated' },
  { value: 'closed', labelKey: 'view.closed' },
] as const
type View = (typeof VIEWS)[number]['value']

function inView(c: Commitment, view: View) {
  if (view === 'closed') return c.status !== 'open'
  if (c.status !== 'open') return false
  return view === 'open' || dueBucket(c) === view
}

export function CommitmentsPage() {
  const { t } = useI18n()
  return (
    <>
      <PageHeader title={t('nav.commitments')} description={t('commitments.desc')} />
      <WorkspaceView>{(data) => <CommitmentList data={data} />}</WorkspaceView>
    </>
  )
}

function CommitmentList({ data }: { data: WorkspaceData }) {
  const [params, setParams] = useSearchParams()
  const view = (VIEWS.some((v) => v.value === params.get('view')) ? params.get('view') : 'open') as View
  const direction = params.get('direction') ?? 'all'
  const [q, setQ] = useState('')
  const { t, fmt } = useI18n()

  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.value, data.commitments.filter((c) => inView(c, v.value)).length])), [data.commitments])

  const items = useMemo(() => {
    const query = q.trim().toLowerCase()
    return data.commitments
      .filter((c) => inView(c, view))
      .filter((c) => direction === 'all' || c.direction === direction)
      .filter((c) => !query || `${c.title} ${c.description} ${personLabel(data, c.personId) ?? ''}`.toLowerCase().includes(query))
      .sort(view === 'closed' ? (a, b) => (b.completedAt ?? b.confirmedAt).localeCompare(a.completedAt ?? a.confirmedAt) : byDueDate)
  }, [data, view, direction, q])

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line">
        <div role="tablist" aria-label={t('commitments.views')} className="flex gap-1 overflow-x-auto px-3 pt-3">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              role="tab"
              aria-selected={view === v.value}
              onClick={() => update('view', v.value)}
              className={cn(
                '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                view === v.value ? 'border-primary text-ink' : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {t(v.labelKey)}
              <span className={cn('tabular rounded-full px-1.5 text-xs', v.value === 'overdue' && counts.overdue ? 'bg-danger-soft text-danger' : 'bg-subtle text-ink-muted')}>
                {fmt.number(counts[v.value])}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input type="search" placeholder={t('commitments.filter')} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label={t('commitments.filterLabel')} />
        </div>
        <div className="sm:w-56">
          <Select value={direction} onChange={(e) => update('direction', e.target.value)} aria-label={t('commitments.directionLabel')}>
            <option value="all">{t('commitments.bothDirections')}</option>
            <option value="we_owe">{t('direction.we_owe')}</option>
            <option value="owed_to_us">{t('direction.owed_to_us')}</option>
          </Select>
        </div>
      </div>
      <div role="tabpanel" aria-label={t(VIEWS.find((v) => v.value === view)!.labelKey)}>
        {items.length === 0 ? (
          <EmptyState
            icon={<ListChecks />}
            title={q ? t('commitments.noMatch') : view === 'overdue' ? t('commitments.noneOverdue') : t('commitments.noneHere')}
            description={q ? t('commitments.tryDifferent') : t('commitments.appearAfter')}
            action={
              !q && (
                <Button asChild variant="secondary" size="sm">
                  <Link to="/capture/review?type=commitment">{t('commitments.reviewProposals')}</Link>
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((c) => (
              <CommitmentRow key={c.id} commitment={c} personLabel={personLabel(data, c.personId)} detailed />
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
