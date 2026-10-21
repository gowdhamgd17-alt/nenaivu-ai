/**
 * Speech service contracts. The UI depends only on these interfaces, so the
 * browser implementations can later be replaced by a dedicated speech-to-text /
 * text-to-speech provider (e.g. a server-side service with better Tamil models).
 */

/** BCP 47 tags for the two supported speech languages. */
export type SpeechLang = 'en-IN' | 'ta-IN'
/** Voice input language setting. `auto` is only offered when a provider can really detect it. */
export type VoiceInputLanguage = 'auto' | SpeechLang

export const SPEECH_LANGS: SpeechLang[] = ['en-IN', 'ta-IN']

export function isSpeechLang(v: unknown): v is SpeechLang {
  return v === 'en-IN' || v === 'ta-IN'
}

// ── Speech to text ──────────────────────────────────────────────────────────

export type RecognitionErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'no_speech'
  | 'language_unsupported'
  | 'network'
  | 'audio_capture'
  | 'aborted'
  | 'unknown'

export interface RecognitionCallbacks {
  /** The microphone is live (permission granted, audio capture started). */
  onAudioStart: () => void
  /** Everything recognised so far, including words that may still change. */
  onPartial: (text: string) => void
  /** Finalised transcript so far. */
  onFinal: (text: string) => void
  onSpeechEnd: () => void
  onError: (code: RecognitionErrorCode) => void
  /** Always called once when the session is over (after success, error or abort). */
  onEnd: () => void
}

export interface RecognitionSession {
  /** Stop listening and return what was heard. */
  stop: () => void
  /** Stop listening and discard everything. */
  abort: () => void
}

export interface SpeechToTextProvider {
  readonly id: string
  /**
   * Where audio is processed, for the disclosure shown before first use.
   * `browser-vendor`: the browser may send audio to its maker's online service.
   */
  readonly audioProcessing: 'on-device' | 'browser-vendor' | 'nenaivu-server'
  /** True only if the provider can reliably identify the spoken language. */
  readonly supportsAutoLanguage: boolean
  isSupported: () => boolean
  start: (lang: SpeechLang, callbacks: RecognitionCallbacks) => RecognitionSession
}

// ── Text to speech ──────────────────────────────────────────────────────────

export interface VoiceInfo {
  id: string
  name: string
  /** Normalised BCP 47 tag, e.g. "ta-IN". */
  lang: string
}

export interface VoiceChoice {
  voice?: VoiceInfo
  /** `exact` = ta-IN for ta-IN; `language` = another Tamil voice; `none` = nothing suitable installed. */
  match: 'exact' | 'language' | 'none'
}

export interface PlaybackCallbacks {
  onStart: () => void
  onEnd: () => void
  onError: () => void
}

export interface TextToSpeechProvider {
  readonly id: string
  isSupported: () => boolean
  /** Resolves once the platform has published its voice list (it may load asynchronously). */
  loadVoices: () => Promise<VoiceInfo[]>
  chooseVoice: (voices: VoiceInfo[], lang: SpeechLang) => VoiceChoice
  speak: (text: string, lang: SpeechLang, voice: VoiceInfo | undefined, callbacks: PlaybackCallbacks) => void
  pause: () => void
  resume: () => void
  /** Stops and clears anything playing or queued. */
  cancel: () => void
}
