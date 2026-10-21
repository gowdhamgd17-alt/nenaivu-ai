import { Check, FilePlus2, History, RefreshCw, X, CalendarClock } from 'lucide-react'
import { formatDateTime } from '@/lib/dates'
import type { ActivityEvent } from '@/types/models'
import { EmptyState } from './states'

const icons: Record<ActivityEvent['type'], React.ReactNode> = {
  capture_created: <FilePlus2 />,
  proposal_approved: <Check />,
  proposal_rejected: <X />,
  commitment_status_changed: <RefreshCw />,
  commitment_due_date_changed: <CalendarClock />,
}

export function ActivityList({ events, empty = 'No activity recorded yet.' }: { events: ActivityEvent[]; empty?: string }) {
  if (events.length === 0) return <EmptyState compact icon={<History />} title={empty} />
  return (
    <ol className="divide-y divide-line">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3 px-5 py-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-muted [&_svg]:size-3.5" aria-hidden>
            {icons[e.type]}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-ink">{e.message}</p>
            <time dateTime={e.at} className="text-xs text-ink-muted">
              {formatDateTime(e.at)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  )
}
