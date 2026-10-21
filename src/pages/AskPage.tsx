import { ArrowUp, BookOpen, Building2, FileText, HelpCircle, ListChecks, Loader2, MessageSquareText, RotateCw, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Notice } from '@/components/states'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WorkspaceView } from '@/components/WorkspaceView'
import { pluralise } from '@/lib/utils'
import type { AskMatch, AskResult, WorkspaceData } from '@/services'
import { useAppStore } from '@/store/AppStore'

type Turn = { id: number; question: string } & ({ state: 'loading' } | { state: 'done'; result: AskResult } | { state: 'error'; message: string })

export function AskPage() {
  const { activeWorkspaceId } = useAppStore()
  return (
    <>
      <PageHeader
        title="Ask Nenaivu"
        description="Ask about your business. Answers only come from records your team has confirmed."
        actions={<StatusBadge tone="warning">Mock retrieval — keyword matching, no AI</StatusBadge>}
      />
      <WorkspaceView>{(data) => <AskThread key={activeWorkspaceId} data={data} />}</WorkspaceView>
    </>
  )
}

function suggestions(data: WorkspaceData) {
  const orgs = data.people.filter((p) => p.kind === 'organisation').slice(0, 2)
  return [...orgs.map((o) => `What is open with ${o.name}?`), 'Which invoices should we not pay?', 'What is our refund policy?'].slice(0, 4)
}

function AskThread({ data }: { data: WorkspaceData }) {
  const { ask } = useAppStore()
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const nextId = useRef(1)
  const endRef = useRef<HTMLDivElement>(null)
  const busy = turns.some((t) => t.state === 'loading')

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  const run = async (q: string, replaceId?: number) => {
    const id = replaceId ?? nextId.current++
    setTurns((t) => (replaceId ? t.map((x) => (x.id === id ? { id, question: q, state: 'loading' } : x)) : [...t, { id, question: q, state: 'loading' }]))
    try {
      const result = await ask(q)
      setTurns((t) => t.map((x) => (x.id === id ? { id, question: q, state: 'done', result } : x)))
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === id ? { id, question: q, state: 'error', message: e instanceof Error ? e.message : 'Request failed.' } : x)))
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || busy) return
    setQuestion('')
    void run(q)
  }

  return (
    <div className="mx-auto max-w-3xl">
      {turns.length === 0 ? (
        <Card className="p-6 text-center sm:p-10">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
            <MessageSquareText className="size-5" aria-hidden />
          </div>
          <h2 className="mt-3 text-base font-semibold text-ink">What would you like to recall?</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
            Every answer links to the confirmed records behind it. If nothing supports an answer, Nenaivu says so instead of guessing.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {suggestions(data).map((s) => (
              <button key={s} onClick={() => void run(s)} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted hover:border-line-strong hover:text-ink">
                {s}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <ol className="space-y-6" aria-label="Questions and answers">
          {turns.map((t) => (
            <li key={t.id} className="space-y-3">
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-card rounded-br-sm bg-ink px-4 py-2.5 text-sm text-white">{t.question}</p>
              </div>
              <Card className="p-4 sm:p-5">
                {t.state === 'loading' && (
                  <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Searching confirmed records…
                  </p>
                )}
                {t.state === 'error' && (
                  <Notice tone="danger" title="Could not search" action={<Button size="sm" variant="secondary" onClick={() => void run(t.question, t.id)}><RotateCw aria-hidden /> Retry</Button>}>
                    {t.message}
                  </Notice>
                )}
                {t.state === 'done' && <Answer result={t.result} />}
              </Card>
            </li>
          ))}
        </ol>
      )}
      <div ref={endRef} />

      <form onSubmit={submit} className="sticky bottom-4 mt-6">
        <div className="flex items-end gap-2 rounded-card border border-line bg-surface p-2 shadow-pop focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15">
          <label htmlFor="ask-input" className="sr-only">
            Ask a question
          </label>
          <textarea
            id="ask-input"
            rows={1}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(e)
              }
            }}
            maxLength={300}
            placeholder="e.g. What did we promise Lotus Apparel?"
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <Button type="submit" size="icon" disabled={!question.trim() || busy} aria-label="Ask">
            <ArrowUp />
          </Button>
        </div>
      </form>
    </div>
  )
}

const typeMeta = {
  memory: { icon: <BookOpen />, label: 'Memory', path: '/memory/' },
  commitment: { icon: <ListChecks />, label: 'Commitment', path: '/commitments/' },
  person: { icon: <UserRound />, label: 'Contact', path: '/people/' },
}

function Answer({ result }: { result: AskResult }) {
  if (result.matches.length === 0) {
    return (
      <div className="flex gap-3">
        <HelpCircle className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
        <div>
          <p className="text-sm font-medium text-ink">No supported answer</p>
          <p className="mt-1 text-sm text-ink-muted">
            No confirmed record in this workspace mentions this. Nenaivu won't guess. If you know the answer,{' '}
            <Link to="/capture/new" className="font-medium text-primary hover:underline">
              capture it
            </Link>{' '}
            so it can be confirmed and remembered.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-ink">Found in {pluralise(result.matches.length, 'confirmed record')}</p>
        <p className="text-xs text-ink-muted">Records containing your question's key words, most relevant first. Open each to check the source.</p>
      </div>
      <ul className="space-y-2">
        {result.matches.map((m) => (
          <MatchItem key={m.id} match={m} />
        ))}
      </ul>
      {result.unmatchedTerms.length > 0 && (
        <Notice tone="neutral" icon={<HelpCircle />} title="Not covered by any record">
          Nothing confirmed mentions: {result.unmatchedTerms.map((t) => `“${t}”`).join(', ')}. Parts of your question may be unanswered.
        </Notice>
      )}
    </div>
  )
}

function MatchItem({ match }: { match: AskMatch }) {
  const meta = typeMeta[match.type]
  return (
    <li>
      <Link to={meta.path + match.id} className="flex gap-3 rounded-input border border-line px-3.5 py-3 transition-colors hover:border-line-strong hover:bg-canvas">
        <span className="mt-0.5 text-ink-faint [&_svg]:size-4" aria-hidden>
          {match.type === 'person' && match.detail.startsWith('Organisation') ? <Building2 /> : meta.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">{match.title}</span>
            <span className="text-xs text-ink-muted">{meta.label}</span>
          </span>
          <span className="mt-0.5 block text-sm text-ink-muted">{match.detail}</span>
          <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-muted">
            <FileText className="size-3" aria-hidden />
            {match.sourceCaptureId ? 'Linked to original source' : 'No source recorded'}
          </span>
        </span>
      </Link>
    </li>
  )
}
