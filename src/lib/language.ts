/**
 * Text-script language detection. Reliable for telling Tamil script from Latin
 * script; it does NOT detect transliterated Tamil ("naalaikku anupunga") or other
 * languages. Used for typed text only — spoken-language detection is not attempted.
 */
const TAMIL_CHAR = /[஀-௿]/g
const LATIN_LETTER = /[A-Za-z]/g

export function scriptCounts(text: string) {
  return {
    tamil: text.match(TAMIL_CHAR)?.length ?? 0,
    latin: text.match(LATIN_LETTER)?.length ?? 0,
  }
}

/** "ta" if the text contains Tamil script (including Tamil–English mixed text), else "en". */
export function detectTextLanguage(text: string): 'en' | 'ta' {
  return scriptCounts(text).tamil >= 2 ? 'ta' : 'en'
}

/** True when Tamil script makes up most of the letters — the note is "in Tamil". */
export function isMostlyTamil(text: string) {
  const { tamil, latin } = scriptCounts(text)
  return tamil > 0 && tamil >= latin
}
