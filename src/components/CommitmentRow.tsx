import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Commitment } from '@/types/models'
import { DirectionLabel, DueBadge } from './badges'

interface CommitmentRowProps {
  commitment: Commitment
  personLabel?: string
  /** Shows the description under the title. */
  detailed?: boolean
}

/**
 * One commitment as a list row. Renders as a stacked card on small screens and a
 * single aligned row on wider screens — the same markup, no separate table.
 */
export function CommitmentRow({ commitment, personLabel, detailed }: CommitmentRowProps) {
  const closed = commitment.status !== 'open'
  return (
    <li>
      <Link
        to={`/commitments/${commitment.id}`}
        className="group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-canvas focus-visible:bg-canvas sm:items-center"
      >
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className={cn('text-sm font-medium text-ink', closed && 'text-ink-muted line-through decoration-ink-faint')}>
              {commitment.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
              <DirectionLabel direction={commitment.direction} />
              {personLabel && <span className="truncate">{personLabel}</span>}
            </div>
            {detailed && commitment.description && (
              <p className="mt-1.5 line-clamp-2 text-xs text-ink-muted">{commitment.description}</p>
            )}
          </div>
          <div className="mt-2 sm:mt-0">
            <DueBadge commitment={commitment} />
          </div>
        </div>
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-ink-faint group-hover:text-ink-muted sm:mt-0" aria-hidden />
      </Link>
    </li>
  )
}
