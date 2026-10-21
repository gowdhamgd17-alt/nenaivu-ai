import { useCallback, useEffect, useRef, useState } from 'react'
import { speechToText as defaultProvider, type RecognitionErrorCode, type RecognitionSession, type SpeechLang, type SpeechToTextProvider } from '@/services/speech'

/**
 * Voice input states:
 *   idle → requesting (waiting for mic permission) → listening → processing → ready
 *   any → error
 */
export type VoiceInputState = 'idle' | 'requesting' | 'listening' | 'processing' | 'ready' | 'error'

interface Options {
  lang: SpeechLang
  /** Receives the recognised text once, when a session finishes with words. */
  onTranscript: (text: string) => void
  provider?: SpeechToTextProvider
}

export function useVoiceInput({ lang, onTranscript, provider = defaultProvider }: Options) {
  const [state, setState] = useState<VoiceInputState>('idle')
  const [partial, setPartial] = useState('')
  const [error, setError] = useState<RecognitionErrorCode | null>(null)

  const session = useRef<RecognitionSession | null>(null)
  const finalText = useRef('')
  const partialText = useRef('')
  const pendingError = useRef<RecognitionErrorCode | null>(null)
  const cancelled = useRef(false)
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  const supported = provider.isSupported()

  const start = useCallback(() => {
    if (session.current) return // never two sessions at once
    if (!provider.isSupported()) {
      setError('unsupported')
      setState('error')
      return
    }
    finalText.current = ''
    partialText.current = ''
    pendingError.current = null
    cancelled.current = false
    setPartial('')
    setError(null)
    setState('requesting')

    session.current = provider.start(lang, {
      onAudioStart: () => setState((s) => (s === 'requesting' ? 'listening' : s)),
      onPartial: (text) => {
        partialText.current = text
        setPartial(text)
        setState((s) => (s === 'requesting' ? 'listening' : s))
      },
      onFinal: (text) => {
        finalText.current = text
      },
      onSpeechEnd: () => setState((s) => (s === 'listening' ? 'processing' : s)),
      onError: (code) => {
        pendingError.current = code
      },
      onEnd: () => {
        session.current = null
        if (cancelled.current) {
          setState('idle')
          return
        }
        const text = (finalText.current || partialText.current).trim()
        const err = pendingError.current
        if (text && (!err || err === 'no_speech')) {
          // Only text the engine actually returned is used — never a placeholder.
          onTranscriptRef.current(text)
          setState('ready')
          return
        }
        setError(err && err !== 'aborted' ? err : 'no_speech')
        setState('error')
      },
    })
  }, [lang, provider])

  /** Finish listening and keep what was heard. */
  const stop = useCallback(() => {
    if (!session.current) return
    setState('processing')
    session.current.stop()
  }, [])

  /** Abandon voice input; nothing is inserted. */
  const cancel = useCallback(() => {
    cancelled.current = true
    session.current?.abort()
    session.current = null
    setPartial('')
    setState('idle')
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setPartial('')
    setState('idle')
  }, [])

  // Never keep the microphone open after the component goes away.
  useEffect(
    () => () => {
      cancelled.current = true
      session.current?.abort()
      session.current = null
    },
    [],
  )

  return { state, partial, error, supported, start, stop, cancel, reset, active: state === 'requesting' || state === 'listening' || state === 'processing' }
}
