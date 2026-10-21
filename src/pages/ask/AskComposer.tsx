import { AlertTriangle, ArrowUp, CheckCircle2, Loader2, Mic, MicOff, Square, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { useVoiceInput } from '@/features/voice/useVoiceInput'
import { resolveVoiceLang, useVoicePrefs } from '@/features/voice/VoicePrefsProvider'
import type { RecognitionErrorCode } from '@/services/speech'

interface AskComposerProps {
  /** Disabled while an answer is loading — prevents duplicate submissions. */
  busy: boolean
  onSubmit: (question: string) => void
}

/**
 * The Ask message composer. Voice input only fills this text box; the user always
 * reviews and sends the text, which then goes through the normal typed-chat path.
 */
export function AskComposer({ busy, onSubmit }: AskComposerProps) {
  const { t, lang } = useI18n()
  const { voiceLang, voiceConsent, acceptVoiceConsent } = useVoicePrefs()
  const [text, setText] = useState('')
  const [consentOpen, setConsentOpen] = useState(false)
  /** What was typed before the last transcript was added, so it can be discarded cleanly. */
  const beforeVoice = useRef<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const speechLang = resolveVoiceLang(voiceLang, lang === 'ta' ? 'ta-IN' : 'en-IN')
  const speechLangName = t(`voice.${speechLang}`)

  const voice = useVoiceInput({
    lang: speechLang,
    onTranscript: (transcript) => {
      setText((prev) => {
        beforeVoice.current = prev
        return prev.trim() ? `${prev.trimEnd()} ${transcript}` : transcript
      })
      requestAnimationFrame(() => textareaRef.current?.focus())
    },
  })

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const q = text.trim()
    if (!q || busy || voice.active) return
    onSubmit(q)
    setText('')
    beforeVoice.current = null
    voice.reset()
  }

  const startVoice = () => {
    if (!voiceConsent) {
      setConsentOpen(true)
      return
    }
    beforeVoice.current = null
    voice.start()
  }

  const discardTranscript = () => {
    if (beforeVoice.current !== null) setText(beforeVoice.current)
    beforeVoice.current = null
    voice.reset()
  }

  const micLabel =
    voice.state === 'requesting' ? t('voice.cancel') : voice.active ? t('voice.stop') : t('voice.start', { language: speechLangName })

  return (
    <div className="space-y-2">
      <VoicePanel
        state={voice.state}
        partial={voice.partial}
        error={voice.error}
        languageName={speechLangName}
        onCancel={voice.cancel}
        onUse={voice.stop}
        onDiscard={discardTranscript}
        onDismiss={voice.reset}
      />

      <form onSubmit={submit}>
        <div
          className={cn(
            'flex items-end gap-2 rounded-card border bg-surface p-2 shadow-pop focus-within:ring-3 focus-within:ring-primary/15',
            voice.active ? 'border-danger/40' : 'border-line focus-within:border-primary',
          )}
        >
          <label htmlFor="ask-input" className="sr-only">
            {t('ask.inputLabel')}
          </label>
          <textarea
            ref={textareaRef}
            id="ask-input"
            rows={1}
            value={text}
            disabled={voice.active}
            onChange={(e) => {
              setText(e.target.value)
              if (voice.state === 'ready' || voice.state === 'error') voice.reset()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            maxLength={300}
            placeholder={t('ask.placeholder')}
            className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none disabled:text-ink-muted"
          />

          {voice.supported ? (
            <button
              type="button"
              onClick={voice.state === 'requesting' ? voice.cancel : voice.active ? voice.stop : startVoice}
              aria-label={micLabel}
              title={micLabel}
              aria-pressed={voice.active}
              disabled={busy}
              className={cn(
                'flex h-10 shrink-0 items-center gap-1.5 rounded-input border px-2.5 text-xs font-semibold transition-colors disabled:opacity-50',
                voice.active ? 'border-danger bg-danger text-white hover:bg-danger/90' : 'border-line bg-surface text-ink hover:bg-subtle',
              )}
            >
              {voice.active ? <Square className="size-3.5 fill-current" aria-hidden /> : <Mic className="size-4" aria-hidden />}
              {/* The selected speech language, always visible next to the mic. */}
              <span aria-hidden lang={speechLang}>
                {speechLang === 'ta-IN' ? 'தமிழ்' : 'EN'}
              </span>
            </button>
          ) : (
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-input border border-dashed border-line text-ink-faint"
              title={t('voice.err.unsupported')}
              role="img"
              aria-label={t('voice.unavailable')}
            >
              <MicOff className="size-4" aria-hidden />
            </span>
          )}

          <Button type="submit" size="icon" disabled={!text.trim() || busy || voice.active} aria-label={t('ask.send')}>
            <ArrowUp />
          </Button>
        </div>
      </form>
      {!voice.supported && <p className="px-1 text-xs text-ink-muted">{t('voice.err.unsupported')}. {t('voice.err.unsupportedHint')}</p>}

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent
          title={t('voice.privacyTitle')}
          description={t('voice.privacyBody')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConsentOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  acceptVoiceConsent()
                  setConsentOpen(false)
                  voice.start()
                }}
              >
                <Mic aria-hidden /> {t('common.continue')}
              </Button>
            </>
          }
        />
      </Dialog>
    </div>
  )
}

interface VoicePanelProps {
  state: ReturnType<typeof useVoiceInput>['state']
  partial: string
  error: RecognitionErrorCode | null
  languageName: string
  onCancel: () => void
  onUse: () => void
  onDiscard: () => void
  onDismiss: () => void
}

/** Status strip above the composer for every voice state except idle. */
function VoicePanel({ state, partial, error, languageName, onCancel, onUse, onDiscard, onDismiss }: VoicePanelProps) {
  const { t } = useI18n()
  if (state === 'idle') return null

  if (state === 'error' && error) {
    const hintKey =
      error === 'unsupported'
        ? 'voice.err.unsupportedHint'
        : error === 'permission_denied'
          ? 'voice.err.permission_deniedHint'
          : error === 'language_unsupported'
            ? 'voice.err.language_unsupportedHint'
            : null
    const titleKey = error === 'aborted' ? 'voice.err.unknown' : (`voice.err.${error}` as const)
    return (
      <div role="alert" className="flex gap-3 rounded-input border border-danger/20 bg-danger-soft px-3.5 py-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-danger">{t(titleKey, { language: languageName })}</p>
          {hintKey && <p className="mt-0.5 text-ink-muted">{t(hintKey)}</p>}
        </div>
        <button onClick={onDismiss} className="self-start rounded p-0.5 text-ink-faint hover:text-ink" aria-label={t('common.dismiss')}>
          <X className="size-4" />
        </button>
      </div>
    )
  }

  if (state === 'ready') {
    return (
      <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-input border border-success/20 bg-success-soft px-3.5 py-2.5 text-sm">
        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-ink">{t('voice.ready')}</p>
          <p className="text-xs text-ink-muted">{t('voice.mixedNote')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDiscard}>
          {t('voice.discard')}
        </Button>
      </div>
    )
  }

  return (
    <div role="status" aria-live="polite" className="rounded-input border border-danger/25 bg-surface px-3.5 py-3 shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {state === 'listening' ? (
          <span className="relative flex size-3 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger/50" />
            <span className="relative inline-flex size-3 rounded-full bg-danger" />
          </span>
        ) : (
          <Loader2 className="size-4 shrink-0 animate-spin text-ink-muted" aria-hidden />
        )}
        <p className="min-w-0 flex-1 text-sm font-medium text-ink">
          {state === 'requesting' && t('voice.requesting')}
          {state === 'listening' && t('voice.listeningIn', { language: languageName })}
          {state === 'processing' && t('voice.processing')}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          {state === 'listening' && (
            <Button variant="secondary" size="sm" onClick={onUse} disabled={!partial}>
              {t('voice.useTranscript')}
            </Button>
          )}
        </div>
      </div>
      {state === 'listening' && (
        <div className="mt-2">
          <p className="text-xs text-ink-muted">{t('voice.liveTranscript')}</p>
          <p className={cn('mt-0.5 text-sm break-words', partial ? 'text-ink' : 'text-ink-faint italic')} dir="auto">
            {partial || t('voice.speakNow')}
          </p>
        </div>
      )}
      <p className="mt-2 text-[11px] text-ink-muted">{t('voice.privacyNote')}</p>
    </div>
  )
}
