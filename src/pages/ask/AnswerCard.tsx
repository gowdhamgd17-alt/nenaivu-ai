import { BookOpen, Building2, FileText, HelpCircle, Languages, ListChecks, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DueBadge } from '@/components/badges'
import { StatusBadge } from '@/components/StatusBadge'
import { LANGS } from '@/i18n/config'
import { useI18n } from '@/i18n/I18nProvider'
import type { AskMatch, AskResult } from '@/services'
import { PlaybackControls } from './PlaybackControls'

const typeMeta = {
  memory: { icon: <BookOpen />, labelKey: 'record.memory', path: '/memory/' },
  commitment: { icon: <ListChecks />, labelKey: 'record.commitment', path: '/commitments/' },
  person: { icon: <UserRound />, labelKey: 'record.contact', path: '/people/' },
} as const

/**
 * One assistant response. The answer text is shown exactly as the service returned it,
 * in its own language (marked with `lang`), even if the interface language changes later.
 * Labels around it follow the interface language.
 */
export function AnswerCard({ id, result }: { id: string; result: AskResult }) {
  const { t } = useI18n()
  const answerLocale = LANGS[result.language].locale
  const languageName = t(result.language === 'ta' ? 'langName.ta' : 'langName.en')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge icon={<Languages />}>{t('ask.answerIn', { language: languageName })}</StatusBadge>
        <span className="text-xs text-ink-muted">{result.languageSource === 'detected' ? t('ask.detected') : t('ask.chosen')}</span>
      </div>

      {result.status === 'unsupported' ? (
        <div className="flex gap-3">
          <HelpCircle className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
          <div className="min-w-0">
            <p lang={answerLocale} className="text-sm text-ink">
              {result.summary}
            </p>
            <Link to="/capture/new" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
              {t('ask.captureIt')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p lang={answerLocale} className="text-sm font-medium text-ink">
            {result.summary}
          </p>
          <section aria-label={t('ask.supportingRecords')}>
            <ul className="space-y-2">
              {result.matches.map((m) => (
                <MatchItem key={m.id} match={m} />
              ))}
            </ul>
          </section>
          {result.unanswered && (
            <div className="flex gap-3 rounded-input border border-line bg-subtle px-3.5 py-3">
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
              <p lang={answerLocale} className="text-sm text-ink-muted">
                {result.unanswered}
              </p>
            </div>
          )}
        </>
      )}

      <div className="border-t border-line pt-3">
        <PlaybackControls id={id} text={result.speechText} lang={answerLocale as 'en-IN' | 'ta-IN'} />
      </div>
    </div>
  )
}

function MatchItem({ match }: { match: AskMatch }) {
  const { t, fmt } = useI18n()
  const meta = typeMeta[match.type]
  const c = match.commitment
  const detail =
    match.type === 'memory'
      ? match.memory?.summary
      : match.type === 'person'
        ? [match.person?.kind === 'organisation' ? t('record.organisation') : t('record.person'), match.person?.role, match.person?.organisationName]
            .filter(Boolean)
            .join(' · ')
        : [c?.personName && t('ask.withPerson', { name: c.personName }), c?.description].filter(Boolean).join(' · ')

  return (
    <li>
      <Link to={meta.path + match.id} className="flex gap-3 rounded-input border border-line px-3.5 py-3 transition-colors hover:border-line-strong hover:bg-canvas">
        <span className="mt-0.5 text-ink-faint [&_svg]:size-4" aria-hidden>
          {match.type === 'person' && match.person?.kind === 'organisation' ? <Building2 /> : meta.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium break-words text-ink">{match.title}</span>
            <span className="text-xs text-ink-muted">{t(meta.labelKey)}</span>
            {c && <DueBadge commitment={{ status: c.status, dueDate: c.dueDate }} />}
          </span>
          {detail && <span className="mt-0.5 block text-sm break-words text-ink-muted">{detail}</span>}
          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3" aria-hidden />
              {match.sourceCaptureId ? t('ask.linkedSource') : t('ask.noSource')}
            </span>
            <span>{t('ask.matchedOn', { terms: fmt.list(match.matchedTerms) })}</span>
          </span>
        </span>
      </Link>
    </li>
  )
}
