import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: number
  hint: string
  to: string
  icon: ReactNode
  tone?: 'neutral' | 'primary' | 'warning' | 'danger'
}

const iconTones = {
  neutral: 'bg-subtle text-ink-muted',
  primary: 'bg-primary-soft text-primary',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

/** Summary number that links to the filtered view it summarises. */
export function MetricCard({ label, value, hint, to, icon, tone = 'neutral' }: MetricCardProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong sm:p-5"
    >
      <div className="flex items-center justify-between">
        <span className={cn('flex size-8 items-center justify-center rounded-input [&_svg]:size-4', iconTones[tone])}>{icon}</span>
        <ChevronRight className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-muted" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-medium text-ink-muted">{label}</p>
      <p className="tabular mt-1 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className={cn('mt-1 text-xs', value > 0 && tone === 'danger' ? 'text-danger' : 'text-ink-muted')}>{hint}</p>
    </Link>
  )
}
