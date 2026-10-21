import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/AppStore'
import { pendingProposals } from '@/store/selectors'

/** Secondary navigation inside the Capture & Review section. */
export function CaptureTabs() {
  const { pathname } = useLocation()
  const { data } = useAppStore()
  const pending = data ? pendingProposals(data).length : 0
  const tabs = [
    { to: '/capture/new', label: 'New capture', active: pathname.startsWith('/capture/new') },
    { to: '/capture/review', label: 'Confirmation inbox', active: pathname.startsWith('/capture/review'), count: pending },
  ]
  return (
    <nav aria-label="Capture and review" className="mb-6 border-b border-line">
      <ul className="-mb-px flex gap-6">
        {tabs.map((t) => (
          <li key={t.to}>
            <Link
              to={t.to}
              aria-current={t.active ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors',
                t.active ? 'border-primary text-ink' : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {t.label}
              {!!t.count && (
                <span className={cn('tabular rounded-full px-1.5 text-xs', t.active ? 'bg-primary-soft text-primary-ink' : 'bg-subtle text-ink-muted')}>
                  {t.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
