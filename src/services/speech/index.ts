/**
 * The single place the app chooses speech providers.
 * To use a dedicated STT/TTS service later, implement `SpeechToTextProvider` /
 * `TextToSpeechProvider` (e.g. streaming audio to a Nenaivu endpoint with consent)
 * and swap them here. API keys must stay on the server, never in this bundle.
 */
import { browserSpeechToText } from './browserSpeechToText'
import { browserTextToSpeech } from './browserTextToSpeech'
import type { SpeechToTextProvider, TextToSpeechProvider } from './types'

export const speechToText: SpeechToTextProvider = browserSpeechToText
export const textToSpeech: TextToSpeechProvider = browserTextToSpeech

export * from './types'
