import { BookOpen, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { relativeTime } from '@/lib/dates'
import type { Memory } from '@/types/models'

interface MemoryCardProps {
  memory: Memory
  peopleLabel?: string
  variant?: 'row' | 'card'
}

export function MemoryCard({ memory, peopleLabel, variant = 'card' }: MemoryCardProps) {
  const meta = (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      <span>Confirmed {relativeTime(memory.confirmedAt)}</span>
      {peopleLabel && <span className="truncate">{peopleLabel}</span>}
      <span className="inline-flex items-center gap-1">
        <FileText className="size-3" aria-hidden />
        {memory.sourceCaptureId ? 'Source linked' : 'No source recorded'}
      </span>
    </div>
  )

  if (variant === 'row') {
    return (
      <li>
        <Link to={`/memory/${memory.id}`} className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-canvas">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{memory.title}</p>
            <p className="mt-0.5 line-clamp-1 text-sm text-ink-muted">{memory.summary}</p>
            {meta}
          </div>
        </Link>
      </li>
    )
  }

  return (
    <li>
      <Link
        to={`/memory/${memory.id}`}
        className="flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-strong"
      >
        <p className="text-sm font-semibold text-ink">{memory.title}</p>
        <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-ink-muted">{memory.summary}</p>
        {meta}
      </Link>
    </li>
  )
}
