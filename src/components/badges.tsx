import { AlertCircle, ArrowDownLeft, ArrowUpRight, BookOpen, CalendarClock, CalendarX2, Check, CircleSlash, Copy, HelpCircle, ListChecks, UserRound } from 'lucide-react'
import { useI18n } from '@/i18n/I18nProvider'
import { dueBucket } from '@/lib/dates'
import { cn, initials } from '@/lib/utils'
import type { Commitment, CommitmentDirection, PartyKind, ProposedDeadline, RecordType } from '@/types/models'
import { StatusBadge } from './StatusBadge'

export function DueBadge({ commitment }: { commitment: Pick<Commitment, 'dueDate' | 'status'> }) {
  const { t, fmt } = useI18n()
  if (commitment.status === 'done') return <StatusBadge tone="success" icon={<Check />}>{t('status.done')}</StatusBadge>
  if (commitment.status === 'cancelled') return <StatusBadge icon={<CircleSlash />}>{t('status.cancelled')}</StatusBadge>
  if (!commitment.dueDate) return <StatusBadge icon={<CalendarX2 />}>{t('due.none')}</StatusBadge>
  const bucket = dueBucket(commitment)
  const tone = bucket === 'overdue' ? 'danger' : bucket === 'today' ? 'warning' : 'neutral'
  return (
    <StatusBadge tone={tone} icon={<CalendarClock />}>
      {fmt.due(commitment.dueDate)}
    </StatusBadge>
  )
}

const recordMeta = {
  commitment: { label: 'record.commitment', icon: <ListChecks /> },
  memory: { label: 'record.memory', icon: <BookOpen /> },
  person: { label: 'record.contact', icon: <UserRound /> },
} as const satisfies Record<RecordType, unknown>

export function RecordTypeBadge({ type, partyKind }: { type: RecordType; partyKind?: PartyKind }) {
  const { t } = useI18n()
  const meta = recordMeta[type]
  const label = type === 'person' && partyKind === 'organisation' ? t('record.organisation') : t(meta.label)
  return (
    <StatusBadge tone="primary" icon={meta.icon}>
      {label}
    </StatusBadge>
  )
}

export function DirectionLabel({ direction, className }: { direction: CommitmentDirection; className?: string }) {
  const { t } = useI18n()
  const Icon = direction === 'we_owe' ? ArrowUpRight : ArrowDownLeft
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-ink-muted', className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden /> {t(`direction.${direction}`)}
    </span>
  )
}

export function DeadlineProposalBadge({ deadline }: { deadline: ProposedDeadline }) {
  const { t } = useI18n()
  if (deadline.kind === 'ambiguous') return <StatusBadge tone="warning" icon={<HelpCircle />}>{t('badge.dateUnclear')}</StatusBadge>
  return null
}

export function DuplicateBadge() {
  const { t } = useI18n()
  return <StatusBadge tone="warning" icon={<Copy />}>{t('badge.duplicate')}</StatusBadge>
}

export function UncertaintyBadge({ count }: { count: number }) {
  const { t } = useI18n()
  if (count === 0) return null
  return <StatusBadge icon={<AlertCircle />}>{t('badge.notes', { count })}</StatusBadge>
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
