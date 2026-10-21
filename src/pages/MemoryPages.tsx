import { BookOpen, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ActivityList } from '@/components/ActivityList'
import { Avatar } from '@/components/badges'
import { MemoryCard } from '@/components/MemoryCard'
import { NotInWorkspace } from '@/components/NotInWorkspace'
import { PageHeader } from '@/components/PageHeader'
import { SourceReference } from '@/components/SourceReference'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, SectionCard } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/form'
import { WorkspaceView } from '@/components/WorkspaceView'
import { useI18n } from '@/i18n/I18nProvider'
import type { WorkspaceData } from '@/services'
import { activityFor, findCapture, findPerson, personLabel } from '@/store/selectors'

export function MemoryListPage() {
  const { t } = useI18n()
  return (
    <>
      <PageHeader title={t('nav.memory')} description={t('memory.desc')} />
      <WorkspaceView>{(data) => <MemoryList data={data} />}</WorkspaceView>
    </>
  )
}

function MemoryList({ data }: { data: WorkspaceData }) {
  const [q, setQ] = useState('')
  const [personId, setPersonId] = useState('')
  const { t } = useI18n()
  const items = useMemo(() => {
    const query = q.trim().toLowerCase()
    return [...data.memories]
      .filter((m) => !personId || m.personIds.includes(personId))
      .filter((m) => !query || `${m.title} ${m.summary}`.toLowerCase().includes(query))
      .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt))
  }, [data.memories, q, personId])
  const linkedPeople = data.people.filter((p) => data.memories.some((m) => m.personIds.includes(p.id)))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('memory.filter')} className="pl-9" aria-label={t('memory.filter')} />
        </div>
        <div className="sm:w-64">
          <Select value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label={t('memory.filterPerson')}>
            <option value="">{t('common.everyone')}</option>
            {linkedPeople.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-ink-muted" aria-live="polite">
        {t('memory.count', { count: items.length })}
      </p>
      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen />}
            title={data.memories.length ? t('memory.noMatch') : t('memory.none')}
            description={data.memories.length ? t('memory.tryDifferent') : t('memory.approveHint')}
            action={
              !data.memories.length && (
                <Button asChild variant="secondary" size="sm">
                  <Link to="/capture/new">{t('dashboard.captureSomething')}</Link>
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => (
            <MemoryCard key={m.id} memory={m} peopleLabel={m.personIds.map((id) => findPerson(data, id)?.name).filter(Boolean).join(', ')} />
          ))}
        </ul>
      )}
    </div>
  )
}

export function MemoryDetailPage() {
  return <WorkspaceView>{(data) => <MemoryDetail data={data} />}</WorkspaceView>
}

function MemoryDetail({ data }: { data: WorkspaceData }) {
  const { id } = useParams()
  const { t, fmt } = useI18n()
  const memory = data.memories.find((m) => m.id === id)
  if (!memory) return <NotInWorkspace kind="memory" back={{ to: '/memory', label: t('nav.memory') }} />
  const capture = findCapture(data, memory.sourceCaptureId)
  const proposal = memory.proposalId ? data.proposals.find((p) => p.id === memory.proposalId) : undefined
  const people = memory.personIds.map((pid) => findPerson(data, pid)).filter((p) => !!p)

  return (
    <>
      <PageHeader back={{ to: '/memory', label: t('nav.memory') }} title={memory.title} description={t('memory.confirmedAt', { date: fmt.dateTime(memory.confirmedAt) })} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title={t('memory.section')} description={t('memory.sectionDesc')}>
            <p className="px-5 py-4 text-[15px] leading-relaxed text-ink">{memory.summary || t('memory.noDetail')}</p>
          </SectionCard>
          <SectionCard title={t('memory.source')} description={t('memory.sourceDesc')}>
            <div className="p-5">
              <SourceReference capture={capture} highlight={proposal?.sourceExcerpt} />
            </div>
          </SectionCard>
        </div>
        <div className="space-y-6">
          <SectionCard title={t('memory.related')}>
            {people.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-muted">{t('memory.noRelated')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {people.map((p) => (
                  <li key={p.id}>
                    <Link to={`/people/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas">
                      <Avatar name={p.name} kind={p.kind} size="sm" />
                      <span className="text-sm font-medium text-ink">{personLabel(data, p.id)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title={t('memory.history')}>
            <ActivityList events={activityFor(data, memory.id)} empty={t('memory.historyEmpty')} />
          </SectionCard>
        </div>
      </div>
    </>
  )
}
