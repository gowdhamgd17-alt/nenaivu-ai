/**
 * Text-to-speech using the browser's Speech Synthesis API.
 *
 * Limitations (surfaced in the UI):
 * - Voices depend on the device and OS; many devices have no Tamil voice installed.
 * - Voices may be published asynchronously (`voiceschanged`), so they are awaited.
 * - Long text is split into sentence-sized chunks because some engines (Chrome)
 *   stop silently on long utterances.
 */
import type { PlaybackCallbacks, SpeechLang, TextToSpeechProvider, VoiceChoice, VoiceInfo } from './types'

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined)

const normaliseLang = (lang: string) => {
  const [base, region] = lang.replace('_', '-').split('-')
  return region ? `${base.toLowerCase()}-${region.toUpperCase()}` : base.toLowerCase()
}

function toInfo(v: SpeechSynthesisVoice): VoiceInfo {
  return { id: v.voiceURI || v.name, name: v.name, lang: normaliseLang(v.lang) }
}

/** Splits at sentence ends (., !, ?, ।) and keeps chunks under ~180 characters. */
export function chunkText(text: string, max = 180): string[] {
  const sentences = text.match(/[^.!?।]+[.!?।]*\s*/g) ?? [text]
  const chunks: string[] = []
  let current = ''
  for (const s of sentences) {
    if ((current + s).length > max && current) {
      chunks.push(current.trim())
      current = ''
    }
    if (s.length > max) {
      // Very long sentence: split on commas / spaces.
      for (const piece of s.split(/(?<=,)\s+/)) chunks.push(piece.trim())
    } else {
      current += s
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(Boolean)
}

/** Each speak() call increments this; events from older utterances are ignored. */
let generation = 0
/** Holds utterances so they are not garbage-collected mid-playback (a Chrome quirk). */
let live: SpeechSynthesisUtterance[] = []

export const browserTextToSpeech: TextToSpeechProvider = {
  id: 'browser-speech-synthesis',

  isSupported: () => !!synth() && typeof SpeechSynthesisUtterance !== 'undefined',

  loadVoices() {
    const s = synth()
    if (!s) return Promise.resolve([])
    const now = s.getVoices()
    if (now.length) return Promise.resolve(now.map(toInfo))
    return new Promise((resolve) => {
      const done = () => {
        s.removeEventListener('voiceschanged', done)
        clearTimeout(timer)
        resolve(s.getVoices().map(toInfo))
      }
      const timer = setTimeout(done, 1500)
      s.addEventListener('voiceschanged', done)
    })
  },

  chooseVoice(voices: VoiceInfo[], lang: SpeechLang): VoiceChoice {
    const exact = voices.filter((v) => v.lang === lang)
    if (exact.length) return { voice: exact[0], match: 'exact' }
    const base = lang.split('-')[0]
    const sameLanguage = voices.filter((v) => v.lang.split('-')[0] === base)
    if (sameLanguage.length) return { voice: sameLanguage[0], match: 'language' }
    return { match: 'none' }
  },

  speak(text: string, lang: SpeechLang, voice: VoiceInfo | undefined, cb: PlaybackCallbacks) {
    const s = synth()
    if (!s) {
      cb.onError()
      return
    }
    s.cancel()
    const gen = ++generation
    const platformVoice = voice ? s.getVoices().find((v) => (v.voiceURI || v.name) === voice.id) : undefined
    const chunks = chunkText(text)
    live = chunks.map((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk)
      // Always tag the language, so the engine can pick a matching voice itself
      // even when we found none.
      u.lang = lang
      if (platformVoice) u.voice = platformVoice
      if (i === 0) u.onstart = () => gen === generation && cb.onStart()
      if (i === chunks.length - 1) u.onend = () => gen === generation && cb.onEnd()
      u.onerror = (e) => {
        if (gen !== generation) return
        // "interrupted"/"canceled" are our own cancel() calls, not failures.
        if (e.error === 'interrupted' || e.error === 'canceled') return
        generation++
        s.cancel()
        cb.onError()
      }
      return u
    })
    // Some engines stay paused across utterances; make sure playback can start.
    s.resume()
    live.forEach((u) => s.speak(u))
  },

  pause: () => synth()?.pause(),
  resume: () => synth()?.resume(),
  cancel: () => {
    generation++
    live = []
    synth()?.cancel()
  },
}
