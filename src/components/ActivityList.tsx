import { CalendarClock, Check, FilePlus2, History, RefreshCw, X } from 'lucide-react'
import { activityText } from '@/i18n/domain'
import { useI18n } from '@/i18n/I18nProvider'
import type { ActivityEvent } from '@/types/models'
import { EmptyState } from './states'

const icons: Record<ActivityEvent['type'], React.ReactNode> = {
  capture_created: <FilePlus2 />,
  proposal_approved: <Check />,
  proposal_rejected: <X />,
  commitment_status_changed: <RefreshCw />,
  commitment_due_date_changed: <CalendarClock />,
}

export function ActivityList({ events, empty }: { events: ActivityEvent[]; empty?: string }) {
  const { t, fmt } = useI18n()
  if (events.length === 0) return <EmptyState compact icon={<History />} title={empty ?? t('activity.empty')} />
  return (
    <ol className="divide-y divide-line">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3 px-5 py-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-muted [&_svg]:size-3.5" aria-hidden>
            {icons[e.type]}
          </span>
          <div className="min-w-0">
            <p className="text-sm break-words text-ink">{activityText(e, t, fmt)}</p>
            <time dateTime={e.at} className="text-xs text-ink-muted">
              {fmt.dateTime(e.at)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  )
}
