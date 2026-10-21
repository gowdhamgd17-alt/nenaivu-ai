import { FlaskConical, Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/AppStore'
import { pendingProposals } from '@/store/selectors'
import { Button } from '../ui/button'
import { isNavActive, NAV_ITEMS } from './nav'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cn('size-7', className)} aria-hidden>
      <rect width="28" height="28" rx="7" fill="var(--color-primary)" />
      <path d="M8.5 19.5V8.5l11 11V8.5" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface AppSidebarProps {
  /** Called after navigation (closes the mobile sheet). */
  onNavigate?: () => void
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { pathname } = useLocation()
  const { data } = useAppStore()
  const pendingCount = data ? pendingProposals(data).length : 0

  return (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="flex h-header shrink-0 items-center gap-2.5 px-5">
        <BrandMark />
        <span className="text-[15px] font-semibold tracking-tight text-ink">Nenaivu AI</span>
      </Link>

      <div className="px-3 pb-3">
        <Button asChild className="w-full justify-start">
          <Link to="/capture/new" onClick={onNavigate}>
            <Plus aria-hidden /> Quick Capture
          </Link>
        </Button>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item, pathname)
            const Icon = item.icon
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-input px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-primary-soft text-primary-ink' : 'text-ink-muted hover:bg-subtle hover:text-ink',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-ink-faint')} aria-hidden />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.to === '/capture/review' && pendingCount > 0 && (
                    <span className="tabular rounded-full bg-primary px-1.5 py-px text-[11px] font-semibold text-white">
                      <span className="sr-only">Pending: </span>
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="m-3 rounded-input border border-line bg-canvas p-3 text-xs text-ink-muted">
        <p className="flex items-center gap-1.5 font-medium text-ink">
          <FlaskConical className="size-3.5 text-primary" aria-hidden /> Prototype
        </p>
        <p className="mt-1 leading-relaxed">Mock data and simulated processing. Changes reset when the page reloads.</p>
      </div>
    </div>
  )
}
