import { Loader2, MessageSquareText, RotateCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Notice } from '@/components/states'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WorkspaceView } from '@/components/WorkspaceView'
import { AnswerLanguageSelect, VoiceLanguageSelect } from '@/features/voice/LanguageControls'
import { SpeechPlaybackProvider } from '@/features/voice/SpeechPlayback'
import { useVoicePrefs } from '@/features/voice/VoicePrefsProvider'
import { serviceErrorText } from '@/i18n/domain'
import { useI18n } from '@/i18n/I18nProvider'
import type { AskResult, WorkspaceData } from '@/services'
import { useAppStore } from '@/store/AppStore'
import { AnswerCard } from './AnswerCard'
import { AskComposer } from './AskComposer'

type Turn = { id: number; question: string } & ({ state: 'loading' } | { state: 'done'; result: AskResult } | { state: 'error'; error: unknown })

export function AskPage() {
  const { activeWorkspaceId } = useAppStore()
  const { t } = useI18n()
  return (
    <>
      <PageHeader title={t('nav.ask')} description={t('ask.desc')} actions={<StatusBadge tone="warning">{t('ask.mockBadge')}</StatusBadge>} />
      <WorkspaceView>
        {(data) => (
          // A new thread per workspace: answers from one workspace never appear in another.
          <SpeechPlaybackProvider key={activeWorkspaceId}>
            <AskThread data={data} />
          </SpeechPlaybackProvider>
        )}
      </WorkspaceView>
    </>
  )
}

function AskThread({ data }: { data: WorkspaceData }) {
  const { ask } = useAppStore()
  const { t } = useI18n()
  const { answerLang } = useVoicePrefs()
  const [turns, setTurns] = useState<Turn[]>([])
  const nextId = useRef(1)
  const endRef = useRef<HTMLDivElement>(null)
  const busy = turns.some((x) => x.state === 'loading')

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [turns])

  const run = async (question: string, replaceId?: number) => {
    const id = replaceId ?? nextId.current++
    setTurns((list) =>
      replaceId ? list.map((x) => (x.id === id ? { id, question, state: 'loading' } : x)) : [...list, { id, question, state: 'loading' }],
    )
    try {
      // The answer-language preference travels through the service layer with the question.
      const result = await ask({ question, responseLanguage: answerLang })
      setTurns((list) => list.map((x) => (x.id === id ? { id, question, state: 'done', result } : x)))
    } catch (error) {
      setTurns((list) => list.map((x) => (x.id === id ? { id, question, state: 'error', error } : x)))
    }
  }

  const orgs = data.people.filter((p) => p.kind === 'organisation').slice(0, 2)
  const suggestions = [...orgs.map((o) => t('ask.suggestOpenWith', { org: o.name })), t('ask.suggestInvoices'), t('ask.suggestRefund')].slice(0, 4)

  return (
    <div className="mx-auto max-w-3xl">
      {turns.length === 0 ? (
        <Card className="p-6 text-center sm:p-10">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
            <MessageSquareText className="size-5" aria-hidden />
          </div>
          <h2 className="mt-3 text-base font-semibold text-ink">{t('ask.emptyTitle')}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{t('ask.emptyDesc')}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => void run(s)}
                disabled={busy}
                className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted hover:border-line-strong hover:text-ink disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <ol className="space-y-6" aria-label={t('ask.thread')}>
          {turns.map((turn) => (
            <li key={turn.id} className="space-y-3">
              <div className="flex justify-end">
                <p dir="auto" className="max-w-[85%] rounded-card rounded-br-sm bg-ink px-4 py-2.5 text-sm break-words text-white">
                  {turn.question}
                </p>
              </div>
              <Card className="p-4 sm:p-5">
                {turn.state === 'loading' && (
                  <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
                    <Loader2 className="size-4 animate-spin" aria-hidden /> {t('ask.searching')}
                  </p>
                )}
                {turn.state === 'error' && (
                  <Notice
                    tone="danger"
                    title={t('ask.couldNotSearch')}
                    action={
                      <Button size="sm" variant="secondary" onClick={() => void run(turn.question, turn.id)}>
                        <RotateCw aria-hidden /> {t('common.retry')}
                      </Button>
                    }
                  >
                    {serviceErrorText(turn.error, t)}
                  </Notice>
                )}
                {turn.state === 'done' && <AnswerCard id={`turn-${turn.id}`} result={turn.result} />}
              </Card>
            </li>
          ))}
        </ol>
      )}
      <div ref={endRef} />

      {/* Solid backdrop so answers never show through the sticky composer area. */}
      <div className="sticky bottom-0 mt-6 space-y-3 bg-canvas pt-3 pb-4">
        <details className="group rounded-card border border-line bg-surface/95 px-4 py-3 shadow-card backdrop-blur-sm open:pb-4">
          <summary className="cursor-pointer list-none text-sm font-medium text-ink marker:hidden">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {t('ask.voiceLanguage')} · {t('ask.answerLanguage')}
              </span>
              <span className="text-xs font-normal text-ink-muted group-open:hidden">
                <LanguageSummary />
              </span>
            </span>
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <VoiceLanguageSelect compact />
            <AnswerLanguageSelect compact />
          </div>
          <p className="mt-3 text-xs text-ink-muted">{t('ask.mockLanguageNote')}</p>
        </details>
        <AskComposer busy={busy} onSubmit={(q) => void run(q)} />
      </div>
    </div>
  )
}

function LanguageSummary() {
  const { t } = useI18n()
  const { voiceLang, answerLang } = useVoicePrefs()
  const voice = voiceLang === 'auto' ? t('voice.auto') : t(`voice.${voiceLang}`)
  const answer = answerLang === 'auto' ? t('ask.answerFollow') : t(`langName.${answerLang}`)
  return (
    <>
      {voice} · {answer}
    </>
  )
}
