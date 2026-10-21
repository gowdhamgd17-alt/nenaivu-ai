import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border border-line bg-surface shadow-card', className)} {...props} />
}

interface SectionCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: string
  description?: string
  action?: React.ReactNode
}

/** Card with a titled header row — used for dashboard sections and detail panels. */
export function SectionCard({ title, description, action, className, children, ...props }: SectionCardProps) {
  const headingId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section aria-labelledby={headingId} className={cn('rounded-card border border-line bg-surface shadow-card', className)} {...props}>
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 id={headingId} className="text-sm font-semibold text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
