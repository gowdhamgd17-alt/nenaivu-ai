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
import { useI18n } from '@/i18n/I18nProvider'
import { useAppStore } from '@/store/AppStore'
import { commitmentsByBucket, pendingProposals, personLabel, recentMemories } from '@/store/selectors'

function greetingKey(hour: number) {
  return hour < 12 ? 'greeting.morning' : hour < 17 ? 'greeting.afternoon' : 'greeting.evening'
}

export function DashboardPage() {
  const { user, workspaces, activeWorkspaceId } = useAppStore()
  const { t, fmt } = useI18n()
  const ws = workspaces.find((w) => w.id === activeWorkspaceId)
  const now = new Date()

  return (
    <>
      <PageHeader
        title={t('nav.overview')}
        description={t(user?.name ? 'dashboard.welcome' : 'dashboard.welcomeNoName', {
          greeting: t(greetingKey(now.getHours())),
          name: user?.name.split(' ')[0] ?? '',
          date: fmt.longDate(now),
          workspace: ws?.name ?? '',
        })}
        actions={
          <Button asChild>
            <Link to="/capture/new">
              <Plus aria-hidden /> {t('nav.quickCapture')}
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

          const parts = [
            overdue.length ? t('dashboard.sumOverdue', { count: overdue.length }) : '',
            dueToday.length ? t('dashboard.sumToday', { count: dueToday.length }) : '',
            pending.length ? t('dashboard.sumPending', { count: pending.length }) : '',
          ].filter(Boolean)
          const summary = parts.length ? fmt.list(parts) : t('dashboard.allClear')

          return (
            <div className="space-y-6">
              <p className="sr-only" aria-live="polite">
                {summary}
              </p>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label={t('dashboard.summaryLabel')}>
                <li>
                  <MetricCard label={t('metric.pending')} value={pending.length} hint={t('metric.pendingHint')} to="/capture/review" icon={<Inbox />} tone="primary" />
                </li>
                <li>
                  <MetricCard label={t('metric.overdue')} value={overdue.length} hint={overdue.length ? t('metric.overdueHint') : t('metric.overdueNone')} to="/commitments?view=overdue" icon={<AlarmClock />} tone="danger" />
                </li>
                <li>
                  <MetricCard label={t('metric.today')} value={dueToday.length} hint={t('metric.todayHint')} to="/commitments?view=today" icon={<CalendarCheck2 />} tone="warning" />
                </li>
                <li>
                  <MetricCard label={t('metric.upcoming')} value={upcoming.length} hint={t('metric.upcomingHint')} to="/commitments?view=upcoming" icon={<CalendarRange />} />
                </li>
              </ul>

              <div className="grid gap-6 xl:grid-cols-5 xl:items-start">
                <SectionCard
                  className="xl:col-span-3"
                  title={t('dashboard.priorities')}
                  description={t('dashboard.prioritiesDesc')}
                  action={
                    <Link to="/commitments" className="shrink-0 text-sm font-medium text-primary hover:underline">
                      {t('dashboard.allCommitments')}
                    </Link>
                  }
                >
                  {priorities.length === 0 ? (
                    <EmptyState compact icon={<CheckCircle2 />} title={t('dashboard.clearTitle')} description={t('dashboard.clearDesc')} />
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
                  title={t('dashboard.pending')}
                  description={t('dashboard.pendingDesc')}
                  action={
                    pending.length > 0 && (
                      <Link to="/capture/review" className="shrink-0 text-sm font-medium text-primary hover:underline">
                        {t('dashboard.reviewAll')}
                      </Link>
                    )
                  }
                >
                  {pending.length === 0 ? (
                    <EmptyState
                      compact
                      icon={<Inbox />}
                      title={t('dashboard.inboxClear')}
                      description={t('dashboard.inboxClearDesc')}
                      action={
                        <Button asChild variant="secondary" size="sm">
                          <Link to="/capture/new">{t('dashboard.captureSomething')}</Link>
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
                    <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">{t('dashboard.moreProposals', { count: pending.length - 4 })}</p>
                  )}
                </SectionCard>
              </div>

              <section aria-labelledby="recent-memories">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id="recent-memories" className="text-sm font-semibold text-ink">
                    {t('dashboard.recentMemories')}
                  </h2>
                  <Link to="/memory" className="text-sm font-medium text-primary hover:underline">
                    {t('nav.memory')}
                  </Link>
                </div>
                {memories.length === 0 ? (
                  <Card>
                    <EmptyState compact icon={<BookOpen />} title={t('dashboard.noMemories')} description={t('dashboard.noMemoriesDesc')} />
                  </Card>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {memories.map((m) => (
                      <MemoryCard key={m.id} memory={m} peopleLabel={m.personIds.map((id) => personLabel(data, id)).filter(Boolean)[0]} />
                    ))}
                  </ul>
                )}
              </section>

            </div>
          )
        }}
      </WorkspaceView>
    </>
  )
}

function DashboardSkeleton() {
  const { t } = useI18n()
  return (
    <div className="space-y-6" aria-busy>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[150px] animate-pulse rounded-card border border-line bg-surface" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <LoadingState label={t('dashboard.loading')} rows={4} />
        </Card>
        <Card className="xl:col-span-2">
          <LoadingState rows={3} />
        </Card>
      </div>
    </div>
  )
}
