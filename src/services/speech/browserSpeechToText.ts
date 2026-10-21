/**
 * Speech-to-text using the browser's Web Speech API (SpeechRecognition).
 *
 * Limitations (surfaced in the UI):
 * - Available in Chromium-based browsers and Safari; not in Firefox.
 * - Chrome and Edge send audio to the browser vendor's online service; Nenaivu
 *   itself never receives or stores audio.
 * - The language must be chosen up front; the API cannot detect it.
 * - Tamil–English code-switching is transcribed only as well as the vendor's model allows.
 */
import type { RecognitionCallbacks, RecognitionErrorCode, RecognitionSession, SpeechLang, SpeechToTextProvider } from './types'

// Minimal typings: SpeechRecognition is not in every TypeScript DOM lib, and Chrome uses a prefix.
interface RecognitionAlternative {
  transcript: string
}
interface RecognitionResult {
  isFinal: boolean
  0: RecognitionAlternative
}
interface RecognitionResultEvent {
  results: ArrayLike<RecognitionResult>
}
interface RecognitionErrorEvent {
  error: string
}
interface BrowserRecognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onaudiostart: (() => void) | null
  onresult: ((e: RecognitionResultEvent) => void) | null
  onspeechend: (() => void) | null
  onerror: ((e: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type RecognitionCtor = new () => BrowserRecognition

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function mapRecognitionError(error: string): RecognitionErrorCode {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permission_denied'
    case 'no-speech':
      return 'no_speech'
    case 'audio-capture':
      return 'audio_capture'
    case 'network':
      return 'network'
    case 'language-not-supported':
      return 'language_unsupported'
    case 'aborted':
      return 'aborted'
    default:
      return 'unknown'
  }
}

export const browserSpeechToText: SpeechToTextProvider = {
  id: 'browser-web-speech',
  audioProcessing: 'browser-vendor',
  supportsAutoLanguage: false,

  isSupported: () => !!getCtor(),

  start(lang: SpeechLang, cb: RecognitionCallbacks): RecognitionSession {
    const Ctor = getCtor()
    if (!Ctor) {
      queueMicrotask(() => {
        cb.onError('unsupported')
        cb.onEnd()
      })
      return { stop: () => {}, abort: () => {} }
    }

    const rec = new Ctor()
    rec.lang = lang
    rec.interimResults = true
    // One utterance per session: stops by itself after a pause, so it never keeps
    // listening in the background.
    rec.continuous = false
    rec.maxAlternatives = 1

    let ended = false
    const finish = () => {
      if (ended) return
      ended = true
      cb.onEnd()
    }

    rec.onaudiostart = () => cb.onAudioStart()
    rec.onresult = (e) => {
      let finalText = ''
      let interim = ''
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      cb.onPartial(`${finalText}${interim}`.trim())
      if (finalText.trim()) cb.onFinal(finalText.trim())
    }
    rec.onspeechend = () => cb.onSpeechEnd()
    rec.onerror = (e) => cb.onError(mapRecognitionError(e.error))
    rec.onend = finish

    try {
      rec.start()
    } catch {
      queueMicrotask(() => {
        cb.onError('unknown')
        finish()
      })
    }

    return {
      stop: () => {
        try {
          rec.stop()
        } catch {
          finish()
        }
      },
      abort: () => {
        rec.onresult = null
        try {
          rec.abort()
        } catch {
          finish()
        }
      },
    }
  },
}
