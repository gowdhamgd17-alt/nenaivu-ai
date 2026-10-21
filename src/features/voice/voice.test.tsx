import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mapRecognitionError } from '@/services/speech/browserSpeechToText'
import { browserTextToSpeech, chunkText } from '@/services/speech/browserTextToSpeech'
import type { RecognitionCallbacks, SpeechToTextProvider } from '@/services/speech'
import { useVoiceInput } from './useVoiceInput'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Scriptable fake provider: the test drives callbacks by hand. */
function fakeProvider(supported = true) {
  let cb: RecognitionCallbacks | null = null
  const calls = { starts: 0, aborts: 0, stops: 0, lang: '' }
  const provider: SpeechToTextProvider = {
    id: 'fake',
    audioProcessing: 'on-device',
    supportsAutoLanguage: false,
    isSupported: () => supported,
    start: (lang, callbacks) => {
      calls.starts++
      calls.lang = lang
      cb = callbacks
      return {
        stop: () => {
          calls.stops++
        },
        abort: () => {
          calls.aborts++
          callbacks.onEnd()
        },
      }
    },
  }
  return { provider, calls, emit: () => cb! }
}

let container: HTMLDivElement
let root: Root
let hook: ReturnType<typeof useVoiceInput>
let transcripts: string[]

function Harness({ provider, lang = 'ta-IN' }: { provider: SpeechToTextProvider; lang?: 'en-IN' | 'ta-IN' }) {
  hook = useVoiceInput({ lang, provider, onTranscript: (t) => transcripts.push(t) })
  return null
}

function mount(provider: SpeechToTextProvider) {
  act(() => root.render(<Harness provider={provider} />))
}

beforeEach(() => {
  transcripts = []
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(() => act(() => root.unmount()))

describe('useVoiceInput', () => {
  it('goes requesting → listening → processing → ready and hands over the transcript', () => {
    const f = fakeProvider()
    mount(f.provider)
    act(() => hook.start())
    expect(hook.state).toBe('requesting')
    expect(f.calls.lang).toBe('ta-IN')
    act(() => f.emit().onAudioStart())
    expect(hook.state).toBe('listening')
    act(() => f.emit().onPartial('நாளை'))
    expect(hook.partial).toBe('நாளை')
    act(() => {
      f.emit().onFinal('நாளை மாதிரிகளை அனுப்பு')
      f.emit().onSpeechEnd()
    })
    expect(hook.state).toBe('processing')
    act(() => f.emit().onEnd())
    expect(hook.state).toBe('ready')
    expect(transcripts).toEqual(['நாளை மாதிரிகளை அனுப்பு'])
  })

  it('reports a denied microphone permission and inserts nothing', () => {
    const f = fakeProvider()
    mount(f.provider)
    act(() => hook.start())
    act(() => {
      f.emit().onError('permission_denied')
      f.emit().onEnd()
    })
    expect(hook.state).toBe('error')
    expect(hook.error).toBe('permission_denied')
    expect(transcripts).toEqual([])
  })

  it('treats an empty session as "no speech" — never invents a transcript', () => {
    const f = fakeProvider()
    mount(f.provider)
    act(() => hook.start())
    act(() => f.emit().onAudioStart())
    act(() => f.emit().onEnd())
    expect(hook.error).toBe('no_speech')
    expect(transcripts).toEqual([])
  })

  it('cancel aborts the session and keeps nothing', () => {
    const f = fakeProvider()
    mount(f.provider)
    act(() => hook.start())
    act(() => f.emit().onPartial('half a sentence'))
    act(() => hook.cancel())
    expect(f.calls.aborts).toBe(1)
    expect(hook.state).toBe('idle')
    expect(transcripts).toEqual([])
  })

  it('does not start a second session while one is running', () => {
    const f = fakeProvider()
    mount(f.provider)
    act(() => hook.start())
    act(() => hook.start())
    expect(f.calls.starts).toBe(1)
  })

  it('falls back cleanly when the browser has no speech recognition', () => {
    const f = fakeProvider(false)
    mount(f.provider)
    expect(hook.supported).toBe(false)
    act(() => hook.start())
    expect(hook.error).toBe('unsupported')
    expect(f.calls.starts).toBe(0)
  })

  it('stops the microphone when the component unmounts', () => {
    const f = fakeProvider()
    mount(f.provider)
    act(() => hook.start())
    act(() => root.unmount())
    expect(f.calls.aborts).toBe(1)
    root = createRoot(container) // for afterEach
  })
})

describe('speech helpers', () => {
  it('maps browser recognition errors to stable codes', () => {
    expect(mapRecognitionError('not-allowed')).toBe('permission_denied')
    expect(mapRecognitionError('service-not-allowed')).toBe('permission_denied')
    expect(mapRecognitionError('no-speech')).toBe('no_speech')
    expect(mapRecognitionError('language-not-supported')).toBe('language_unsupported')
    expect(mapRecognitionError('something-new')).toBe('unknown')
  })

  it('chooses an exact voice, then a same-language voice, then reports none', () => {
    const voices = [
      { id: 'a', name: 'English GB', lang: 'en-GB' },
      { id: 'b', name: 'English India', lang: 'en-IN' },
      { id: 'c', name: 'Tamil Sri Lanka', lang: 'ta-LK' },
    ]
    expect(browserTextToSpeech.chooseVoice(voices, 'en-IN')).toEqual({ voice: voices[1], match: 'exact' })
    expect(browserTextToSpeech.chooseVoice(voices, 'ta-IN')).toEqual({ voice: voices[2], match: 'language' })
    expect(browserTextToSpeech.chooseVoice(voices.slice(0, 2), 'ta-IN')).toEqual({ match: 'none' })
  })

  it('splits long text into sentence chunks', () => {
    const text = 'One. Two is a bit longer. '.repeat(20)
    const chunks = chunkText(text, 60)
    expect(chunks.every((c) => c.length <= 60)).toBe(true)
    expect(chunks.join(' ').replace(/\s+/g, ' ').trim()).toBe(text.replace(/\s+/g, ' ').trim())
  })
})
