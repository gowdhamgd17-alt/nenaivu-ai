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
import { cn, pluralise } from '@/lib/utils'
import type { WorkspaceData } from '@/services'
import { byDueDate, findCapture, findPerson, personLabel } from '@/store/selectors'
import type { PartyKind } from '@/types/models'

export function PeopleListPage() {
  return (
    <>
      <PageHeader title="People & Organisations" description="Contacts confirmed in this workspace and what you owe each other." />
      <WorkspaceView>{(data) => <PeopleList data={data} />}</WorkspaceView>
    </>
  )
}

function PeopleList({ data }: { data: WorkspaceData }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'all' | PartyKind>('all')
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
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or role" className="pl-9" aria-label="Filter people and organisations" />
        </div>
        <div role="group" aria-label="Contact type" className="grid grid-cols-3 rounded-input bg-subtle p-0.5 text-sm font-medium sm:w-72">
          {(['all', 'person', 'organisation'] as const).map((k) => (
            <button
              key={k}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn('rounded-[6px] py-1.5 transition-colors', kind === k ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink')}
            >
              {k === 'all' ? 'All' : k === 'person' ? 'People' : 'Orgs'}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<UserRound />} title="No contacts match" description="New contacts are added by approving people proposals." />
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
                      {p.kind === 'organisation' && <Building2 className="size-3.5 text-ink-faint" aria-label="Organisation" />}
                    </p>
                    <p className="truncate text-xs text-ink-muted">{[p.role, org?.name].filter(Boolean).join(' · ') || 'No role recorded'}</p>
                  </div>
                  <span className="hidden text-xs text-ink-muted sm:block">{open ? pluralise(open, 'open commitment') : 'No open commitments'}</span>
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
  const person = data.people.find((p) => p.id === id)
  if (!person) return <NotInWorkspace kind="contact" back={{ to: '/people', label: 'Back to People & Organisations' }} />

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
        back={{ to: '/people', label: 'People & Organisations' }}
        title={person.name}
        description={
          <>
            {person.kind === 'organisation' ? 'Organisation' : 'Person'}
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
          <SectionCard title="Open commitments" description={person.kind === 'organisation' ? 'Including commitments with people at this organisation' : undefined}>
            {open.length === 0 ? (
              <EmptyState compact title="No open commitments" />
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
              Memories
            </h2>
            {memories.length === 0 ? (
              <Card>
                <EmptyState compact title="No memories linked" />
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
            <SectionCard title="Completed & cancelled">
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
            <SectionCard title="People">
              {members.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-muted">No people linked to this organisation.</p>
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
          <SectionCard title="Added from">
            <div className="p-5">
              <SourceReference capture={capture} clamp />
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  )
}
