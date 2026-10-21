/** Supported interface languages. Identifiers are fixed: "en" and "ta". */
export type Lang = 'en' | 'ta'

export const LANGS: Record<Lang, { locale: string; nativeName: string }> = {
  en: { locale: 'en-IN', nativeName: 'English' },
  ta: { locale: 'ta-IN', nativeName: 'தமிழ்' },
}

export const DEFAULT_LANG: Lang = 'en'

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'ta'
}

/** Storage keys for per-browser preferences (prototype: localStorage). */
export const PREF_KEYS = {
  lang: 'nenaivu.lang',
  voiceLang: 'nenaivu.voiceLang',
  answerLang: 'nenaivu.answerLang',
  voiceConsent: 'nenaivu.voiceConsent',
} as const
