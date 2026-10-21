import { Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { relativeTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Proposal } from '@/types/models'
import { DeadlineProposalBadge, DuplicateBadge, RecordTypeBadge, UncertaintyBadge } from './badges'
import { StatusBadge } from './StatusBadge'

interface ReviewProposalCardProps {
  proposal: Proposal
  personLabel?: string
  to: string
  selected?: boolean
}

/** Compact proposal summary used in the Confirmation Inbox list and on the dashboard. */
export function ReviewProposalCard({ proposal, personLabel, to, selected }: ReviewProposalCardProps) {
  const { fields } = proposal
  return (
    <li>
      <Link
        to={to}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'block border-l-2 px-5 py-3.5 transition-colors hover:bg-canvas',
          selected ? 'border-l-primary bg-primary-soft/50 hover:bg-primary-soft/60' : 'border-l-transparent',
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <RecordTypeBadge type={proposal.recordType} partyKind={fields.partyKind} />
          {proposal.status === 'approved' && <StatusBadge tone="success" icon={<Check />}>Approved</StatusBadge>}
          {proposal.status === 'rejected' && <StatusBadge icon={<X />}>Rejected</StatusBadge>}
          {proposal.status === 'pending' && (
            <>
              {proposal.recordType === 'commitment' && <DeadlineProposalBadge deadline={fields.deadline} />}
              {proposal.possibleDuplicateOf && <DuplicateBadge />}
              <UncertaintyBadge count={proposal.uncertainties.length} />
            </>
          )}
        </div>
        <p className="mt-2 text-sm font-medium text-ink">{fields.title}</p>
        <p className="mt-1 truncate text-xs text-ink-muted">
          {[personLabel ?? fields.personName, `Proposed ${relativeTime(proposal.createdAt)}`].filter(Boolean).join(' · ')}
        </p>
      </Link>
    </li>
  )
}
