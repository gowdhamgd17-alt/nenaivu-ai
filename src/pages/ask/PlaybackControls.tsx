import { AlertTriangle, Loader2, Pause, Play, RotateCcw, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSpeechPlayback } from '@/features/voice/SpeechPlayback'
import { useI18n } from '@/i18n/I18nProvider'
import type { SpeechLang } from '@/services/speech'

interface PlaybackControlsProps {
  id: string
  text: string
  /** Language of the response text — decides the voice, not the interface language. */
  lang: SpeechLang
}

/** Speak / pause / resume / stop / replay for one assistant response. */
export function PlaybackControls({ id, text, lang }: PlaybackControlsProps) {
  const { t } = useI18n()
  const p = useSpeechPlayback()
  const languageName = t(lang === 'ta-IN' ? 'langName.ta' : 'langName.en')

  if (!p.supported) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Button variant="secondary" size="sm" disabled aria-label={t('speech.speak')}>
          <Volume2 aria-hidden /> {t('speech.speak')}
        </Button>
        <span>{t('speech.unsupported')}</span>
      </div>
    )
  }

  const mine = p.activeId === id
  const status = mine ? p.status : 'idle'
  const choice = p.voices ? p.chooseVoice(lang) : null

  return (
    <div className="space-y-2">
      <div role="group" aria-label={t('speech.controls')} className="flex flex-wrap items-center gap-2">
        {status === 'idle' && (
          <Button variant="secondary" size="sm" onClick={() => p.play(id, text, lang)}>
            {p.played.has(id) ? <RotateCcw aria-hidden /> : <Volume2 aria-hidden />}
            {p.played.has(id) ? t('speech.replay') : t('speech.speak')}
          </Button>
        )}
        {status === 'loading' && (
          <Button variant="secondary" size="sm" disabled>
            <Loader2 className="animate-spin" aria-hidden /> {t('speech.loading')}
          </Button>
        )}
        {status === 'playing' && (
          <Button variant="secondary" size="sm" onClick={p.pause}>
            <Pause aria-hidden /> {t('speech.pause')}
          </Button>
        )}
        {status === 'paused' && (
          <Button variant="secondary" size="sm" onClick={p.resume}>
            <Play aria-hidden /> {t('speech.resume')}
          </Button>
        )}
        {status !== 'idle' && (
          <Button variant="ghost" size="sm" onClick={p.stop}>
            <Square aria-hidden /> {t('speech.stop')}
          </Button>
        )}
        {(status === 'playing' || status === 'paused') && (
          <span className="flex items-center gap-1.5 text-xs text-ink-muted" aria-live="polite">
            {status === 'playing' && <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />}
            {status === 'playing' ? t('speech.playing') : t('speech.paused')}
          </span>
        )}
        {choice?.voice && status === 'idle' && <span className="text-xs text-ink-faint">{t('speech.voice', { voice: choice.voice.name })}</span>}
      </div>
      {choice?.match === 'none' && (
        <p className="flex gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t('speech.noVoice', { language: languageName })}
        </p>
      )}
      {p.failedId === id && (
        <p role="alert" className="text-xs text-danger">
          {t('speech.failed')}
        </p>
      )}
    </div>
  )
}
