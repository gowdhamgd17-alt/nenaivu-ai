import { AlarmClock, BookOpen, CalendarCheck2, CalendarRange, CheckCircle2, Inbox, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CommitmentRow } from '@/components/CommitmentRow'
import { MemoryCard } from '@/components/MemoryCard'
import { MetricCard } from '@/components/MetricCard'
import { PageHeader } from '@/components/PageHeader'
import { ReviewProposalCard } from '@/components/ReviewProposalCard'
import { EmptyState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, SectionCard } from '@/components/ui/card'
import { WorkspaceView } from '@/components/WorkspaceView'
import { pluralise } from '@/lib/utils'
import { useAppStore } from '@/store/AppStore'
import { commitmentsByBucket, pendingProposals, personLabel, recentMemories } from '@/store/selectors'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const dateLine = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

export function DashboardPage() {
  const { user, workspaces, activeWorkspaceId } = useAppStore()
  const ws = workspaces.find((w) => w.id === activeWorkspaceId)

  return (
    <>
      <PageHeader
        title="Overview"
        description={
          <>
            {greeting()}
            {user ? `, ${user.name.split(' ')[0]}` : ''}. {dateLine.format(new Date())}
            {ws ? ` · ${ws.name}` : ''}
          </>
        }
        actions={
          <Button asChild>
            <Link to="/capture/new">
              <Plus aria-hidden /> Quick Capture
            </Link>
          </Button>
        }
      />
      <WorkspaceView loading={<DashboardSkeleton />}>
        {(data) => {
          const overdue = commitmentsByBucket(data, 'overdue')
          const dueToday = commitmentsByBucket(data, 'today')
          const upcoming = commitmentsByBucket(data, 'upcoming')
          const pending = pendingProposals(data)
          const priorities = [...overdue, ...dueToday]
          const memories = recentMemories(data)

          const summary =
            priorities.length || pending.length
              ? [
                  overdue.length && `${pluralise(overdue.length, 'commitment')} overdue`,
                  dueToday.length && `${dueToday.length} due today`,
                  pending.length && `${pluralise(pending.length, 'proposal')} to confirm`,
                ]
                  .filter(Boolean)
                  .join(', ')
              : 'Nothing is overdue and your inbox is clear.'

          return (
            <div className="space-y-6">
              <p className="sr-only" aria-live="polite">
                {summary}
              </p>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Summary">
                <li>
                  <MetricCard label="Pending confirmation" value={pending.length} hint="Proposals awaiting review" to="/capture/review" icon={<Inbox />} tone="primary" />
                </li>
                <li>
                  <MetricCard label="Overdue" value={overdue.length} hint={overdue.length ? 'Past their due date' : 'Nothing overdue'} to="/commitments?view=overdue" icon={<AlarmClock />} tone="danger" />
                </li>
                <li>
                  <MetricCard label="Due today" value={dueToday.length} hint="Open commitments" to="/commitments?view=today" icon={<CalendarCheck2 />} tone="warning" />
                </li>
                <li>
                  <MetricCard label="Upcoming" value={upcoming.length} hint="Dated, after today" to="/commitments?view=upcoming" icon={<CalendarRange />} />
                </li>
              </ul>

              <div className="grid gap-6 xl:grid-cols-5 xl:items-start">
                <SectionCard
                  className="xl:col-span-3"
                  title="Today's priorities"
                  description="Overdue and due-today commitments, oldest first"
                  action={
                    <Link to="/commitments" className="text-sm font-medium text-primary hover:underline">
                      All commitments
                    </Link>
                  }
                >
                  {priorities.length === 0 ? (
                    <EmptyState compact icon={<CheckCircle2 />} title="You're clear for today" description="No overdue or due-today commitments." />
                  ) : (
                    <ul className="divide-y divide-line">
                      {priorities.map((c) => (
                        <CommitmentRow key={c.id} commitment={c} personLabel={personLabel(data, c.personId)} />
                      ))}
                    </ul>
                  )}
                </SectionCard>

                <SectionCard
                  className="xl:col-span-2"
                  title="Pending confirmations"
                  description="Nothing becomes memory until you approve it"
                  action={
                    pending.length > 0 && (
                      <Link to="/capture/review" className="text-sm font-medium text-primary hover:underline">
                        Review all
                      </Link>
                    )
                  }
                >
                  {pending.length === 0 ? (
                    <EmptyState
                      compact
                      icon={<Inbox />}
                      title="Inbox is clear"
                      description="Captured notes will produce proposals here."
                      action={
                        <Button asChild variant="secondary" size="sm">
                          <Link to="/capture/new">Capture something</Link>
                        </Button>
                      }
                    />
                  ) : (
                    <ul className="divide-y divide-line">
                      {pending.slice(0, 4).map((p) => (
                        <ReviewProposalCard key={p.id} proposal={p} personLabel={personLabel(data, p.fields.personId)} to={`/capture/review/${p.id}`} />
                      ))}
                    </ul>
                  )}
                  {pending.length > 4 && (
                    <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">+ {pluralise(pending.length - 4, 'more proposal')}</p>
                  )}
                </SectionCard>
              </div>

              <section aria-labelledby="recent-memories">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id="recent-memories" className="text-sm font-semibold text-ink">
                    Recent memories
                  </h2>
                  <Link to="/memory" className="text-sm font-medium text-primary hover:underline">
                    Business Memory
                  </Link>
                </div>
                {memories.length === 0 ? (
                  <Card>
                    <EmptyState compact icon={<BookOpen />} title="No confirmed memories yet" description="Approved memory proposals appear here." />
                  </Card>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {memories.map((m) => (
                      <MemoryCard key={m.id} memory={m} peopleLabel={m.personIds.map((id) => personLabel(data, id)).filter(Boolean)[0]} />
                    ))}
                  </ul>
                )}
              </section>

              <p className="text-xs text-ink-faint">Sample data for demonstration — these businesses, people and events are fictional.</p>
            </div>
          )
        }}
      </WorkspaceView>
    </>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[150px] animate-pulse rounded-card border border-line bg-surface" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <LoadingState label="Loading overview" rows={4} />
        </Card>
        <Card className="xl:col-span-2">
          <LoadingState rows={3} />
        </Card>
      </div>
    </div>
  )
}
