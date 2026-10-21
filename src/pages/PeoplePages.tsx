import { Building2, Search, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/badges'
import { CommitmentRow } from '@/components/CommitmentRow'
import { MemoryCard } from '@/components/MemoryCard'
import { NotInWorkspace } from '@/components/NotInWorkspace'
import { PageHeader } from '@/components/PageHeader'
import { SourceReference } from '@/components/SourceReference'
import { EmptyState } from '@/components/states'
import { Card, SectionCard } from '@/components/ui/card'
import { Input } from '@/components/ui/form'
import { WorkspaceView } from '@/components/WorkspaceView'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import type { WorkspaceData } from '@/services'
import { byDueDate, findCapture, findPerson, personLabel } from '@/store/selectors'
import type { PartyKind } from '@/types/models'

export function PeopleListPage() {
  const { t } = useI18n()
  return (
    <>
      <PageHeader title={t('nav.people')} description={t('people.desc')} />
      <WorkspaceView>{(data) => <PeopleList data={data} />}</WorkspaceView>
    </>
  )
}

function PeopleList({ data }: { data: WorkspaceData }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'all' | PartyKind>('all')
  const { t } = useI18n()
  const items = useMemo(() => {
    const query = q.trim().toLowerCase()
    return data.people
      .filter((p) => kind === 'all' || p.kind === kind)
      .filter((p) => !query || `${p.name} ${p.role ?? ''}`.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data.people, q, kind])

  const openCount = (id: string) =>
    data.commitments.filter((c) => c.status === 'open' && (c.personId === id || findPerson(data, c.personId)?.organisationId === id)).length

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('people.filter')} className="pl-9" aria-label={t('people.filterLabel')} />
        </div>
        <div role="group" aria-label={t('people.typeLabel')} className="grid grid-cols-3 rounded-input bg-subtle p-0.5 text-sm font-medium sm:w-96">
          {(['all', 'person', 'organisation'] as const).map((k) => (
            <button
              key={k}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn('min-w-0 rounded-[6px] px-1 py-1.5 leading-snug transition-colors', kind === k ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink')}
            >
              {k === 'all' ? t('people.all') : k === 'person' ? t('people.people') : t('people.orgs')}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<UserRound />} title={t('people.noMatch')} description={t('people.noMatchDesc')} />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((p) => {
            const open = openCount(p.id)
            const org = findPerson(data, p.organisationId)
            return (
              <li key={p.id}>
                <Link to={`/people/${p.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-canvas">
                  <Avatar name={p.name} kind={p.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {p.name}
                      {p.kind === 'organisation' && <Building2 className="size-3.5 text-ink-faint" aria-label={t('record.organisation')} />}
                    </p>
                    <p className="truncate text-xs text-ink-muted">{[p.role, org?.name].filter(Boolean).join(' · ') || t('people.noRole')}</p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-ink-muted sm:block">{open ? t('people.openCount', { count: open }) : t('people.noOpen')}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function PersonDetailPage() {
  return <WorkspaceView>{(data) => <PersonDetail data={data} />}</WorkspaceView>
}

function PersonDetail({ data }: { data: WorkspaceData }) {
  const { id } = useParams()
  const { t } = useI18n()
  const person = data.people.find((p) => p.id === id)
  if (!person) return <NotInWorkspace kind="contact" back={{ to: '/people', label: t('nav.people') }} />

  const members = data.people.filter((p) => p.organisationId === person.id)
  const relatedIds = new Set([person.id, ...members.map((m) => m.id)])
  const commitments = data.commitments.filter((c) => c.personId && relatedIds.has(c.personId)).sort(byDueDate)
  const open = commitments.filter((c) => c.status === 'open')
  const closed = commitments.filter((c) => c.status !== 'open')
  const memories = data.memories.filter((m) => m.personIds.some((pid) => relatedIds.has(pid)))
  const org = findPerson(data, person.organisationId)
  const capture = findCapture(data, person.sourceCaptureId)

  return (
    <>
      <PageHeader
        back={{ to: '/people', label: t('nav.people') }}
        title={person.name}
        description={
          <>
            {person.kind === 'organisation' ? t('record.organisation') : t('record.person')}
            {person.role && ` · ${person.role}`}
            {org && (
              <>
                {' · '}
                <Link to={`/people/${org.id}`} className="text-primary hover:underline">
                  {org.name}
                </Link>
              </>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title={t('people.openCommitments')} description={person.kind === 'organisation' ? t('people.includingMembers') : undefined}>
            {open.length === 0 ? (
              <EmptyState compact title={t('people.noOpen')} />
            ) : (
              <ul className="divide-y divide-line">
                {open.map((c) => (
                  <CommitmentRow key={c.id} commitment={c} personLabel={personLabel(data, c.personId)} />
                ))}
              </ul>
            )}
          </SectionCard>
          <section aria-labelledby="pm">
            <h2 id="pm" className="mb-3 text-sm font-semibold text-ink">
              {t('people.memories')}
            </h2>
            {memories.length === 0 ? (
              <Card>
                <EmptyState compact title={t('people.noMemories')} />
              </Card>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {memories.map((m) => (
                  <MemoryCard key={m.id} memory={m} />
                ))}
              </ul>
            )}
          </section>
          {closed.length > 0 && (
            <SectionCard title={t('people.closed')}>
              <ul className="divide-y divide-line">
                {closed.map((c) => (
                  <CommitmentRow key={c.id} commitment={c} personLabel={personLabel(data, c.personId)} />
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
        <div className="space-y-6">
          {person.kind === 'organisation' && (
            <SectionCard title={t('people.members')}>
              {members.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-muted">{t('people.noMembers')}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {members.map((m) => (
                    <li key={m.id}>
                      <Link to={`/people/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas">
                        <Avatar name={m.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink">{m.name}</span>
                          {m.role && <span className="block text-xs text-ink-muted">{m.role}</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
          <SectionCard title={t('people.addedFrom')}>
            <div className="p-5">
              <SourceReference capture={capture} clamp />
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  )
}
