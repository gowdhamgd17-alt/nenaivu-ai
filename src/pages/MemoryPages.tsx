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
import { formatDateTime } from '@/lib/dates'
import { pluralise } from '@/lib/utils'
import type { WorkspaceData } from '@/services'
import { activityFor, findCapture, findPerson, personLabel } from '@/store/selectors'

export function MemoryListPage() {
  return (
    <>
      <PageHeader title="Business Memory" description="Facts and context your team has confirmed, each linked to where it came from." />
      <WorkspaceView>{(data) => <MemoryList data={data} />}</WorkspaceView>
    </>
  )
}

function MemoryList({ data }: { data: WorkspaceData }) {
  const [q, setQ] = useState('')
  const [personId, setPersonId] = useState('')
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
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter memories" className="pl-9" aria-label="Filter memories" />
        </div>
        <div className="sm:w-60">
          <Select value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="Filter by person or organisation">
            <option value="">Everyone</option>
            {linkedPeople.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-ink-muted" aria-live="polite">
        {pluralise(items.length, 'confirmed memory', 'confirmed memories')}
      </p>
      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen />}
            title={data.memories.length ? 'No memories match your filter' : 'No confirmed memories yet'}
            description={data.memories.length ? 'Try a different search or person.' : 'Approve memory proposals in the Confirmation inbox to build your business memory.'}
            action={
              !data.memories.length && (
                <Button asChild variant="secondary" size="sm">
                  <Link to="/capture/new">Capture something</Link>
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
  const memory = data.memories.find((m) => m.id === id)
  if (!memory) return <NotInWorkspace kind="memory" back={{ to: '/memory', label: 'Back to Business Memory' }} />
  const capture = findCapture(data, memory.sourceCaptureId)
  const proposal = memory.proposalId ? data.proposals.find((p) => p.id === memory.proposalId) : undefined
  const people = memory.personIds.map((pid) => findPerson(data, pid)).filter((p) => !!p)

  return (
    <>
      <PageHeader back={{ to: '/memory', label: 'Business Memory' }} title={memory.title} description={`Confirmed ${formatDateTime(memory.confirmedAt)}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Memory" description="Confirmed by a person in this workspace">
            <p className="px-5 py-4 text-[15px] leading-relaxed text-ink">{memory.summary || 'No further detail.'}</p>
          </SectionCard>
          <SectionCard title="Source" description="Original captured text, unchanged">
            <div className="p-5">
              <SourceReference capture={capture} highlight={proposal?.sourceExcerpt} />
            </div>
          </SectionCard>
        </div>
        <div className="space-y-6">
          <SectionCard title="Related">
            {people.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-muted">No people or organisations linked.</p>
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
          <SectionCard title="History">
            <ActivityList events={activityFor(data, memory.id)} empty="Created before activity tracking." />
          </SectionCard>
        </div>
      </div>
    </>
  )
}
