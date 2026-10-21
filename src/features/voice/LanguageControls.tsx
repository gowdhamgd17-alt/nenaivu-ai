import { Info } from 'lucide-react'
import { useId } from 'react'
import { Select } from '@/components/ui/form'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import type { AnswerLanguagePreference } from '@/services'
import { speechToText, SPEECH_LANGS, type VoiceInputLanguage } from '@/services/speech'
import { useVoicePrefs } from './VoicePrefsProvider'

/** Voice input language: English (India) / Tamil (India); Auto only when the provider supports it. */
export function VoiceLanguageSelect({ className, compact }: { className?: string; compact?: boolean }) {
  const { t } = useI18n()
  const { voiceLang, setVoiceLang } = useVoicePrefs()
  const id = useId()
  const autoOk = speechToText.supportsAutoLanguage
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className={cn('mb-1 block font-medium text-ink', compact ? 'text-xs' : 'text-sm')}>
        {t('ask.voiceLanguage')}
      </label>
      <Select
        id={id}
        value={voiceLang}
        onChange={(e) => setVoiceLang(e.target.value as VoiceInputLanguage)}
        aria-describedby={autoOk ? undefined : `${id}-note`}
        className={compact ? 'h-9' : undefined}
      >
        <option value="auto" disabled={!autoOk}>
          {autoOk ? t('voice.auto') : t('voice.autoUnavailable')}
        </option>
        {SPEECH_LANGS.map((l) => (
          <option key={l} value={l}>
            {t(`voice.${l}`)}
          </option>
        ))}
      </Select>
      {!autoOk && (
        <p id={`${id}-note`} className="mt-1 flex gap-1 text-xs text-ink-muted">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
          {t('voice.autoNote')}
        </p>
      )}
    </div>
  )
}

/** Answer language: follow the question, or always English / Tamil. */
export function AnswerLanguageSelect({ className, compact }: { className?: string; compact?: boolean }) {
  const { t } = useI18n()
  const { answerLang, setAnswerLang } = useVoicePrefs()
  const id = useId()
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className={cn('mb-1 block font-medium text-ink', compact ? 'text-xs' : 'text-sm')}>
        {t('ask.answerLanguage')}
      </label>
      <Select id={id} value={answerLang} onChange={(e) => setAnswerLang(e.target.value as AnswerLanguagePreference)} className={compact ? 'h-9' : undefined}>
        <option value="auto">{t('ask.answerFollow')}</option>
        <option value="en">{t('langName.en')}</option>
        <option value="ta">{t('langName.ta')}</option>
      </Select>
    </div>
  )
}
