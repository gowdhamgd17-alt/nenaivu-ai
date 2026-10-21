import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { PREF_KEYS } from '@/i18n/config'
import { useI18n } from '@/i18n/I18nProvider'
import { readPref, writePref } from '@/lib/preferences'
import type { AnswerLanguagePreference } from '@/services'
import { isSpeechLang, speechToText, type SpeechLang, type VoiceInputLanguage } from '@/services/speech'

const isAnswerPref = (v: unknown): v is AnswerLanguagePreference => v === 'auto' || v === 'en' || v === 'ta'
const isConsent = (v: unknown): v is 'yes' => v === 'yes'
const isVoiceInputLang = (v: unknown): v is VoiceInputLanguage => isSpeechLang(v) || (v === 'auto' && speechToText.supportsAutoLanguage)

interface VoicePrefs {
  /** Language spoken into the microphone. Separate from the interface language. */
  voiceLang: VoiceInputLanguage
  setVoiceLang: (v: VoiceInputLanguage) => void
  /** Language Ask answers are written and spoken in. Separate from the interface language. */
  answerLang: AnswerLanguagePreference
  setAnswerLang: (v: AnswerLanguagePreference) => void
  /** Whether the user has seen and accepted the voice-processing disclosure. */
  voiceConsent: boolean
  acceptVoiceConsent: () => void
}

const Ctx = createContext<VoicePrefs | null>(null)

export function VoicePrefsProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n()
  // First-time default follows the interface language; after that the saved choice wins.
  const [voiceLang, setVoiceLangState] = useState<VoiceInputLanguage>(() =>
    readPref<VoiceInputLanguage>(PREF_KEYS.voiceLang, isVoiceInputLang, lang === 'ta' ? 'ta-IN' : 'en-IN'),
  )
  const [answerLang, setAnswerLangState] = useState<AnswerLanguagePreference>(() => readPref(PREF_KEYS.answerLang, isAnswerPref, 'auto'))
  const [voiceConsent, setConsent] = useState(() => readPref<'yes' | 'no'>(PREF_KEYS.voiceConsent, (v): v is 'yes' | 'no' => isConsent(v), 'no') === 'yes')

  const setVoiceLang = useCallback((v: VoiceInputLanguage) => {
    setVoiceLangState(v)
    writePref(PREF_KEYS.voiceLang, v)
  }, [])
  const setAnswerLang = useCallback((v: AnswerLanguagePreference) => {
    setAnswerLangState(v)
    writePref(PREF_KEYS.answerLang, v)
  }, [])
  const acceptVoiceConsent = useCallback(() => {
    setConsent(true)
    writePref(PREF_KEYS.voiceConsent, 'yes')
  }, [])

  const value = useMemo(
    () => ({ voiceLang, setVoiceLang, answerLang, setAnswerLang, voiceConsent, acceptVoiceConsent }),
    [voiceLang, setVoiceLang, answerLang, setAnswerLang, voiceConsent, acceptVoiceConsent],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVoicePrefs() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useVoicePrefs must be used inside VoicePrefsProvider')
  return ctx
}

/** Resolves the voice setting to a concrete recognition language. */
// eslint-disable-next-line react-refresh/only-export-components
export function resolveVoiceLang(v: VoiceInputLanguage, fallback: SpeechLang): SpeechLang {
  return v === 'auto' ? fallback : v
}
