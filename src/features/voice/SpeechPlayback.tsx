import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { textToSpeech as defaultProvider, type SpeechLang, type TextToSpeechProvider, type VoiceChoice, type VoiceInfo } from '@/services/speech'

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused'

interface PlaybackValue {
  supported: boolean
  /** null until the platform has published its voice list. */
  voices: VoiceInfo[] | null
  activeId: string | null
  status: PlaybackStatus
  /** Ids of responses that finished playing at least once (for "Replay"). */
  played: ReadonlySet<string>
  failedId: string | null
  chooseVoice: (lang: SpeechLang) => VoiceChoice
  play: (id: string, text: string, lang: SpeechLang) => void
  pause: () => void
  resume: () => void
  stop: () => void
}

const Ctx = createContext<PlaybackValue | null>(null)

/**
 * One playback controller per Ask thread: starting a response stops the previous one,
 * so two answers never talk over each other. Everything stops on unmount.
 */
export function SpeechPlaybackProvider({ children, provider = defaultProvider }: { children: ReactNode; provider?: TextToSpeechProvider }) {
  const supported = provider.isSupported()
  const [voices, setVoices] = useState<VoiceInfo[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  const [played, setPlayed] = useState<ReadonlySet<string>>(new Set())
  const [failedId, setFailedId] = useState<string | null>(null)
  const request = useRef(0)

  useEffect(() => {
    if (!supported) return
    let alive = true
    void provider.loadVoices().then((v) => alive && setVoices(v))
    return () => {
      alive = false
      provider.cancel()
    }
  }, [provider, supported])

  const chooseVoice = useCallback((lang: SpeechLang) => provider.chooseVoice(voices ?? [], lang), [provider, voices])

  const play = useCallback(
    (id: string, text: string, lang: SpeechLang) => {
      if (!supported) return
      const req = ++request.current
      provider.cancel()
      setFailedId(null)
      setActiveId(id)
      setStatus('loading')
      void provider.loadVoices().then((list) => {
        if (req !== request.current) return // superseded by another play/stop
        setVoices(list)
        const choice = provider.chooseVoice(list, lang)
        provider.speak(text, lang, choice.voice, {
          onStart: () => req === request.current && setStatus('playing'),
          onEnd: () => {
            if (req !== request.current) return
            setStatus('idle')
            setActiveId(null)
            setPlayed((s) => new Set(s).add(id))
          },
          onError: () => {
            if (req !== request.current) return
            setStatus('idle')
            setActiveId(null)
            setFailedId(id)
          },
        })
      })
    },
    [provider, supported],
  )

  const pause = useCallback(() => {
    provider.pause()
    setStatus('paused')
  }, [provider])

  const resume = useCallback(() => {
    provider.resume()
    setStatus('playing')
  }, [provider])

  const stop = useCallback(() => {
    request.current++
    provider.cancel()
    setStatus('idle')
    setActiveId(null)
  }, [provider])

  const value = useMemo(
    () => ({ supported, voices, activeId, status, played, failedId, chooseVoice, play, pause, resume, stop }),
    [supported, voices, activeId, status, played, failedId, chooseVoice, play, pause, resume, stop],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSpeechPlayback() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSpeechPlayback must be used inside SpeechPlaybackProvider')
  return ctx
}
