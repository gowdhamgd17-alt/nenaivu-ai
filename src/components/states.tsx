import { AlertTriangle, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({ icon, title, description, action, compact, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      {icon && (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-subtle text-ink-muted [&_svg]:size-5">{icon}</div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface LoadingStateProps {
  label?: string
  rows?: number
  className?: string
}

/** Skeleton rows with an accessible status label. */
export function LoadingState({ label = 'Loading', rows = 3, className }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={cn('space-y-3 p-5', className)}>
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="size-8 shrink-0 animate-pulse rounded-full bg-subtle" />
          <div className="flex-1 space-y-2">
            <div className="h-3 animate-pulse rounded bg-subtle" style={{ width: `${70 - i * 12}%` }} />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-subtle" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ title = 'Could not load this view', message, onRetry, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw aria-hidden /> Try again
        </Button>
      )}
    </div>
  )
}

/** Inline notice used for feedback and trust messaging. */
export function Notice({
  tone = 'neutral',
  icon,
  title,
  children,
  className,
  action,
}: {
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
  icon?: ReactNode
  title?: ReactNode
  children?: ReactNode
  className?: string
  action?: ReactNode
}) {
  const tones = {
    neutral: 'border-line bg-subtle text-ink',
    primary: 'border-primary/20 bg-primary-soft text-primary-ink',
    success: 'border-success/20 bg-success-soft text-success',
    warning: 'border-warning/25 bg-warning-soft text-warning',
    danger: 'border-danger/20 bg-danger-soft text-danger',
  }
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn('flex gap-3 rounded-input border px-3.5 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0', tones[tone], className)}
    >
      {icon}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-ink-muted [&_strong]:text-ink')}>{children}</div>}
      </div>
      {action}
    </div>
  )
}
