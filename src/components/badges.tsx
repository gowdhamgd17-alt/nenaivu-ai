import { AlertCircle, ArrowDownLeft, ArrowUpRight, BookOpen, CalendarClock, CalendarX2, Check, CircleSlash, Copy, HelpCircle, ListChecks, UserRound } from 'lucide-react'
import { describeDue, dueBucket } from '@/lib/dates'
import { cn, initials } from '@/lib/utils'
import type { Commitment, CommitmentDirection, PartyKind, ProposedDeadline, RecordType } from '@/types/models'
import { StatusBadge } from './StatusBadge'

export function DueBadge({ commitment }: { commitment: Pick<Commitment, 'dueDate' | 'status'> }) {
  if (commitment.status === 'done') return <StatusBadge tone="success" icon={<Check />}>Done</StatusBadge>
  if (commitment.status === 'cancelled') return <StatusBadge icon={<CircleSlash />}>Cancelled</StatusBadge>
  if (!commitment.dueDate) return <StatusBadge icon={<CalendarX2 />}>No due date</StatusBadge>
  const bucket = dueBucket(commitment)
  const tone = bucket === 'overdue' ? 'danger' : bucket === 'today' ? 'warning' : 'neutral'
  return (
    <StatusBadge tone={tone} icon={<CalendarClock />}>
      {describeDue(commitment.dueDate)}
    </StatusBadge>
  )
}

const recordMeta: Record<RecordType, { label: string; icon: React.ReactNode }> = {
  commitment: { label: 'Commitment', icon: <ListChecks /> },
  memory: { label: 'Memory', icon: <BookOpen /> },
  person: { label: 'Contact', icon: <UserRound /> },
}

export function RecordTypeBadge({ type, partyKind }: { type: RecordType; partyKind?: PartyKind }) {
  const meta = recordMeta[type]
  const label = type === 'person' && partyKind === 'organisation' ? 'Organisation' : meta.label
  return (
    <StatusBadge tone="primary" icon={meta.icon}>
      {label}
    </StatusBadge>
  )
}

export function DirectionLabel({ direction, className }: { direction: CommitmentDirection; className?: string }) {
  return direction === 'we_owe' ? (
    <span className={cn('inline-flex items-center gap-1 text-xs text-ink-muted', className)}>
      <ArrowUpRight className="size-3.5" aria-hidden /> We owe
    </span>
  ) : (
    <span className={cn('inline-flex items-center gap-1 text-xs text-ink-muted', className)}>
      <ArrowDownLeft className="size-3.5" aria-hidden /> Owed to us
    </span>
  )
}

export function DeadlineProposalBadge({ deadline }: { deadline: ProposedDeadline }) {
  if (deadline.kind === 'ambiguous') return <StatusBadge tone="warning" icon={<HelpCircle />}>Date unclear</StatusBadge>
  return null
}

export function DuplicateBadge() {
  return <StatusBadge tone="warning" icon={<Copy />}>Possible duplicate</StatusBadge>
}

export function UncertaintyBadge({ count }: { count: number }) {
  if (count === 0) return null
  return <StatusBadge icon={<AlertCircle />}>{count === 1 ? '1 note' : `${count} notes`}</StatusBadge>
}

export function Avatar({ name, kind = 'person', size = 'md' }: { name: string; kind?: PartyKind; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-primary-soft font-semibold text-primary-ink',
        kind === 'organisation' ? 'rounded-input' : 'rounded-full',
        size === 'sm' ? 'size-7 text-[11px]' : 'size-9 text-xs',
      )}
    >
      {initials(name)}
    </span>
  )
}
