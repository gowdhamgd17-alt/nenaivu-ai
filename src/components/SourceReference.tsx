import { FileText, Quote } from 'lucide-react'
import { captureSourceLabel } from '@/i18n/domain'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import type { Capture } from '@/types/models'

interface SourceReferenceProps {
  capture?: Capture
  /** Portion of the capture to highlight (e.g. what a proposal was derived from). */
  highlight?: string
  className?: string
  /** Collapse long captures to a few lines. */
  clamp?: boolean
}

/** Shows original captured content verbatim, visually distinct from anything generated. */
export function SourceReference({ capture, highlight, className, clamp }: SourceReferenceProps) {
  const { t, fmt } = useI18n()
  if (!capture) {
    return (
      <div className={cn('rounded-input border border-dashed border-line px-4 py-3 text-sm text-ink-muted', className)}>
        {t('source.missing')}
      </div>
    )
  }

  const content = capture.content
  const idx = highlight ? content.indexOf(highlight) : -1

  return (
    <figure className={cn('rounded-input border border-line bg-canvas', className)}>
      <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line px-4 py-2.5 text-xs text-ink-muted">
        {capture.kind === 'file' ? <FileText className="size-3.5" aria-hidden /> : <Quote className="size-3.5" aria-hidden />}
        <span className="font-medium text-ink">{t('source.original')}</span>
        <span aria-hidden>·</span>
        <span>{captureSourceLabel(capture, t)}</span>
        <span aria-hidden>·</span>
        <time dateTime={capture.createdAt}>{fmt.dateTime(capture.createdAt)}</time>
      </figcaption>
      {/* The original is shown exactly as captured, whatever the interface language. */}
      <blockquote dir="auto" className={cn('px-4 py-3 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap text-ink', clamp && 'line-clamp-6')}>
        {idx >= 0 && highlight ? (
          <>
            {content.slice(0, idx)}
            <mark className="rounded-sm bg-primary-soft px-0.5 text-primary-ink">{highlight}</mark>
            {content.slice(idx + highlight.length)}
          </>
        ) : (
          content
        )}
      </blockquote>
    </figure>
  )
}
