import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/AppStore'
import { pendingProposals } from '@/store/selectors'

/** Secondary navigation inside the Capture & Review section. */
export function CaptureTabs() {
  const { pathname } = useLocation()
  const { data } = useAppStore()
  const { t, fmt } = useI18n()
  const pending = data ? pendingProposals(data).length : 0
  const tabs = [
    { to: '/capture/new', label: t('captureTabs.new'), active: pathname.startsWith('/capture/new') },
    { to: '/capture/review', label: t('captureTabs.inbox'), active: pathname.startsWith('/capture/review'), count: pending },
  ]
  return (
    <nav aria-label={t('captureTabs.label')} className="mb-6 overflow-x-auto border-b border-line">
      <ul className="-mb-px flex gap-6">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              aria-current={tab.active ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors',
                tab.active ? 'border-primary text-ink' : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {tab.label}
              {!!tab.count && (
                <span className={cn('tabular rounded-full px-1.5 text-xs', tab.active ? 'bg-primary-soft text-primary-ink' : 'bg-subtle text-ink-muted')}>
                  {fmt.number(tab.count)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
