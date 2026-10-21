import { BookOpen, Building2, ListChecks, Search, UserRound } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/AppStore'

interface Result {
  id: string
  label: string
  meta: string
  to: string
  icon: React.ReactNode
}

function useSearchResults(query: string): Result[] {
  const { data } = useAppStore()
  const { t } = useI18n()
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!data || q.length < 2) return []
    const hit = (...texts: (string | undefined)[]) => texts.some((t) => t?.toLowerCase().includes(q))
    const results: Result[] = [
      ...data.commitments
        .filter((c) => hit(c.title, c.description))
        .map((c) => ({ id: c.id, label: c.title, meta: t('record.commitment'), to: `/commitments/${c.id}`, icon: <ListChecks /> })),
      ...data.memories
        .filter((m) => hit(m.title, m.summary))
        .map((m) => ({ id: m.id, label: m.title, meta: t('record.memory'), to: `/memory/${m.id}`, icon: <BookOpen /> })),
      ...data.people
        .filter((p) => hit(p.name, p.role))
        .map((p) => ({
          id: p.id,
          label: p.name,
          meta: p.kind === 'organisation' ? t('record.organisation') : t('record.person'),
          to: `/people/${p.id}`,
          icon: p.kind === 'organisation' ? <Building2 /> : <UserRound />,
        })),
    ]
    return results.slice(0, 8)
  }, [data, query, t])
}

/**
 * Searches confirmed records in the active workspace only (client-side substring match).
 * Pending proposals are intentionally excluded — they are not yet business memory.
 */
export function GlobalSearch({ autoFocus, onDone, className }: { autoFocus?: boolean; onDone?: () => void; className?: string }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const results = useSearchResults(query)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const { t } = useI18n()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (r: Result) => {
    navigate(r.to)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
    onDone?.()
  }

  const showPanel = open && query.trim().length >= 2

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-activedescendant={showPanel && results[active] ? `${listId}-${active}` : undefined}
        aria-label={t('search.label')}
        placeholder={t('search.placeholder')}
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault()
            go(results[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
        className="h-10 w-full rounded-input border border-line bg-canvas pr-10 pl-9 text-sm text-ink placeholder:text-ink-faint focus-visible:border-primary focus-visible:bg-surface focus-visible:ring-3 focus-visible:ring-primary/15 focus-visible:outline-none"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-line px-1.5 text-[11px] text-ink-faint md:block">
        /
      </kbd>
      {showPanel && (
        <div className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-card border border-line bg-surface shadow-pop">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">{t('search.noResults', { query: query.trim() })}</p>
          ) : (
            <ul id={listId} role="listbox" aria-label={t('search.results')} className="max-h-80 overflow-y-auto p-1.5">
              {results.map((r, i) => (
                <li
                  key={r.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(r)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-faint',
                    i === active && 'bg-subtle',
                  )}
                >
                  {r.icon}
                  <span className="min-w-0 flex-1 truncate text-ink">{r.label}</span>
                  <span className="text-xs text-ink-muted">{r.meta}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('search.scope')}</p>
        </div>
      )}
    </div>
  )
}
