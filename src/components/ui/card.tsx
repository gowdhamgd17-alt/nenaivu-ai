import { useId, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  // min-w-0: as a grid/flex child, a card must never be widened by unbreakable content (e.g. long Tamil labels).
  return <div className={cn('min-w-0 rounded-card border border-line bg-surface shadow-card', className)} {...props} />
}

interface SectionCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: string
  description?: string
  action?: React.ReactNode
}

/** Card with a titled header row — used for dashboard sections and detail panels. */
export function SectionCard({ title, description, action, className, children, ...props }: SectionCardProps) {
  // useId, not the title: titles may be Tamil and must not produce colliding ids.
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={cn('min-w-0 rounded-card border border-line bg-surface shadow-card', className)} {...props}>
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
