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
import { dueBucket } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { WorkspaceData } from '@/services'
import { byDueDate, personLabel } from '@/store/selectors'
import type { Commitment } from '@/types/models'

const VIEWS = [
  { value: 'open', label: 'All open' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'undated', label: 'No due date' },
  { value: 'closed', label: 'Completed & cancelled' },
] as const
type View = (typeof VIEWS)[number]['value']

function inView(c: Commitment, view: View) {
  if (view === 'closed') return c.status !== 'open'
  if (c.status !== 'open') return false
  return view === 'open' || dueBucket(c) === view
}

export function CommitmentsPage() {
  return (
    <>
      <PageHeader title="Commitments" description="Promises made by you and to you, each confirmed by a person." />
      <WorkspaceView>{(data) => <CommitmentList data={data} />}</WorkspaceView>
    </>
  )
}

function CommitmentList({ data }: { data: WorkspaceData }) {
  const [params, setParams] = useSearchParams()
  const view = (VIEWS.some((v) => v.value === params.get('view')) ? params.get('view') : 'open') as View
  const direction = params.get('direction') ?? 'all'
  const [q, setQ] = useState('')

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
        <div role="tablist" aria-label="Commitment views" className="flex gap-1 overflow-x-auto px-3 pt-3">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              role="tab"
              aria-selected={view === v.value}
              onClick={() => update('view', v.value)}
              className={cn(
                '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pb-2.5 text-sm font-medium transition-colors',
                view === v.value ? 'border-primary text-ink' : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {v.label}
              <span className={cn('tabular rounded-full px-1.5 text-xs', v.value === 'overdue' && counts.overdue ? 'bg-danger-soft text-danger' : 'bg-subtle text-ink-muted')}>
                {counts[v.value]}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input type="search" placeholder="Filter by title, details or person" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Filter commitments" />
        </div>
        <div className="sm:w-48">
          <Select value={direction} onChange={(e) => update('direction', e.target.value)} aria-label="Direction">
            <option value="all">Both directions</option>
            <option value="we_owe">We owe</option>
            <option value="owed_to_us">Owed to us</option>
          </Select>
        </div>
      </div>
      <div role="tabpanel" aria-label={VIEWS.find((v) => v.value === view)?.label}>
        {items.length === 0 ? (
          <EmptyState
            icon={<ListChecks />}
            title={q ? 'No commitments match your filter' : view === 'overdue' ? 'Nothing overdue' : 'No commitments here'}
            description={q ? 'Try a different search.' : 'Commitments appear after you approve them in the Confirmation inbox.'}
            action={
              !q && (
                <Button asChild variant="secondary" size="sm">
                  <Link to="/capture/review?type=commitment">Review commitment proposals</Link>
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
