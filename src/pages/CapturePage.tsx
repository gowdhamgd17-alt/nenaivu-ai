import { AlertTriangle, Check, FileText, Loader2, Mic, Paperclip, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaptureTabs } from '@/components/CaptureTabs'
import { PageHeader } from '@/components/PageHeader'
import { Notice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label, Textarea } from '@/components/ui/form'
import { serviceErrorText } from '@/i18n/domain'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/AppStore'

const MAX_CHARS = 5000
const MIN_CHARS = 10
const MAX_FILE_BYTES = 1_000_000
const SUPPORTED_EXT = ['txt', 'md', 'csv']

/** Example notes are sample business content, so they are not translated with the UI. */
const EXAMPLES = [
  {
    labelKey: 'capture.exampleCustomer',
    text: 'Call with Priya Raman from Lotus Apparel. She confirmed the spring order will be 1,500 m, not 1,200 m. We need to send the revised quote tomorrow. Priya will share the final colour cards next week.',
  },
  {
    labelKey: 'capture.exampleSupplier',
    text: 'Spoke to Arjun at Northwind Logistics. The corrected freight invoice is delayed. He promised to send it within 3 days.',
  },
  {
    labelKey: 'capture.exampleTamil',
    text: 'அர்ஜுனுடன் பேசினேன். திருத்திய சரக்குக் கட்டண இன்வாய்ஸ் இன்னும் வரவில்லை. அடுத்த வாரம் அனுப்புவதாகச் சொன்னார்.',
  },
] as const

type Phase = 'idle' | 'saving' | 'extracting' | 'error'

interface AttachedFile {
  name: string
  size: number
  content: string
}

export function CapturePage() {
  const { createCapture, status } = useAppStore()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [file, setFile] = useState<AttachedFile | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [serviceError, setServiceError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const fileInput = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const ids = { text: useId(), file: useId(), counter: useId() }
  const { t, tx, fmt } = useI18n()

  const busy = phase === 'saving' || phase === 'extracting'
  const content = file ? file.content : text
  const remaining = MAX_CHARS - text.length

  useEffect(() => {
    if (phase !== 'saving') return
    const t = setTimeout(() => setPhase('extracting'), 500)
    return () => clearTimeout(t)
  }, [phase])

  const validate = (): string | null => {
    const trimmed = content.trim()
    if (!trimmed) return file ? t('capture.errFileEmpty') : t('capture.errEmpty')
    if (trimmed.length < MIN_CHARS) return t('capture.errShort', { min: MIN_CHARS })
    if (content.length > MAX_CHARS) return t('capture.errLong', { max: fmt.number(MAX_CHARS) })
    return null
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy) return
    const problem = validate()
    if (problem) {
      if (file) setFileError(problem)
      else {
        setFieldError(problem)
        textareaRef.current?.focus()
      }
      return
    }
    setFieldError(null)
    setServiceError(null)
    setPhase('saving')
    try {
      const result = await createCapture({
        content,
        kind: file ? 'file' : 'text',
        fileName: file?.name,
      })
      navigate(`/capture/review?capture=${result.capture.id}`, {
        state: { capturedCount: result.proposals.length },
      })
    } catch (err) {
      setPhase('error')
      setServiceError(serviceErrorText(err, t))
    }
  }

  const onPickFile = async (f: File | undefined) => {
    setFileError(null)
    setServiceError(null)
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!SUPPORTED_EXT.includes(ext)) {
      setFileError(t('capture.fileUnsupported', { name: f.name }))
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError(t('capture.fileTooLarge', { name: f.name }))
      return
    }
    try {
      const content = await f.text()
      if (content.length > MAX_CHARS) {
        setFileError(t('capture.fileTooLong', { name: f.name, count: fmt.number(content.length), max: fmt.number(MAX_CHARS) }))
        return
      }
      setFile({ name: f.name, size: f.size, content })
      setFieldError(null)
    } catch {
      setFileError(t('capture.fileUnreadable', { name: f.name }))
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <>
      <PageHeader title={t('nav.capture')} description={t('capture.desc')} />
      <CaptureTabs />

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="lg:col-span-2" noValidate aria-busy={busy}>
          <Card className="overflow-hidden">
            <div className="space-y-4 p-5 sm:p-6">
              {!file ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <Label htmlFor={ids.text}>{t('capture.label')}</Label>
                    <span
                      id={ids.counter}
                      className={cn('tabular text-xs', remaining < 0 ? 'text-danger' : remaining < 300 ? 'text-warning' : 'text-ink-muted')}
                      aria-live={remaining < 300 ? 'polite' : 'off'}
                    >
                      {fmt.number(text.length)} / {fmt.number(MAX_CHARS)}
                    </span>
                  </div>
                  <Textarea
                    ref={textareaRef}
                    id={ids.text}
                    value={text}
                    disabled={busy}
                    onChange={(e) => {
                      setText(e.target.value)
                      if (fieldError) setFieldError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
                    }}
                    rows={9}
                    maxLength={MAX_CHARS + 500}
                    placeholder={t('capture.placeholder')}
                    aria-invalid={!!fieldError}
                    aria-describedby={[ids.counter, fieldError ? `${ids.text}-error` : `${ids.text}-hint`].join(' ')}
                    className="min-h-52 resize-y text-[15px]"
                  />
                  {fieldError ? (
                    <p id={`${ids.text}-error`} role="alert" className="text-xs text-danger">
                      {fieldError}
                    </p>
                  ) : (
                    <p id={`${ids.text}-hint`} className="text-xs text-ink-muted">
                      {t('capture.hint')}
                    </p>
                  )}
                  {!text && !busy && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-ink-muted">{t('capture.tryExample')}</span>
                      {EXAMPLES.map((ex) => (
                        <button
                          key={ex.labelKey}
                          type="button"
                          onClick={() => setText(ex.text)}
                          className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-muted hover:border-line-strong hover:text-ink"
                        >
                          {t(ex.labelKey)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-ink">{t('capture.attachedFile')}</p>
                  <div className="rounded-input border border-line">
                    <div className="flex items-center gap-3 border-b border-line px-3 py-2.5">
                      <FileText className="size-4 text-ink-muted" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                        <p className="text-xs text-ink-muted">
                          {t('capture.fileMeta', { size: fmt.number(Math.round(file.size / 102.4) / 10), chars: fmt.number(file.content.length) })}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => setFile(null)} disabled={busy} aria-label={t('capture.removeFile', { name: file.name })}>
                        <X />
                      </Button>
                    </div>
                    <pre className="max-h-56 overflow-auto px-3 py-2.5 font-mono text-xs whitespace-pre-wrap text-ink-muted">{file.content || t('capture.emptyFile')}</pre>
                  </div>
                </div>
              )}

              <div className="rounded-input border border-dashed border-line-strong bg-canvas px-4 py-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{t('capture.fromFile')}</p>
                    <p id={`${ids.file}-hint`} className="mt-0.5 text-xs text-ink-muted">
                      {tx('capture.fileHint', undefined, { b: (c) => <strong className="font-medium text-ink">{c}</strong> })}
                    </p>
                  </div>
                  <input
                    ref={fileInput}
                    id={ids.file}
                    type="file"
                    accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
                    className="sr-only"
                    onChange={(e) => void onPickFile(e.target.files?.[0])}
                    aria-describedby={`${ids.file}-hint`}
                    disabled={busy}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()} disabled={busy}>
                    <Paperclip aria-hidden /> {file ? t('capture.replaceFile') : t('capture.chooseFile')}
                  </Button>
                </div>
                {fileError && (
                  <p role="alert" className="mt-2 text-xs text-danger">
                    {fileError}
                  </p>
                )}
              </div>

              {serviceError && (
                <Notice
                  tone="danger"
                  icon={<AlertTriangle />}
                  title={t('capture.failedTitle')}
                  action={
                    <Button type="submit" size="sm" variant="secondary">
                      {t('common.tryAgain')}
                    </Button>
                  }
                >
                  {serviceError} {t('capture.failedKept')}
                </Notice>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-line bg-canvas px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <Button type="button" variant="ghost" size="sm" disabled title={t('capture.voiceTitle')} className="justify-start">
                <Mic aria-hidden /> {t('capture.voiceNote')} <span className="text-xs font-normal">{t('capture.comingLater')}</span>
              </Button>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-ink-faint sm:inline">{t('capture.shortcut')}</span>
                <Button type="submit" loading={busy} disabled={status !== 'ready'} className="w-full sm:w-auto">
                  {!busy && <Sparkles aria-hidden />}
                  {busy ? t('capture.submitting') : t('capture.submit')}
                </Button>
              </div>
            </div>
          </Card>

          {busy && <ProcessingSteps phase={phase} />}
        </form>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">{t('capture.nextTitle')}</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {(
                [
                  ['capture.step1Title', 'capture.step1'],
                  ['capture.step2Title', 'capture.step2'],
                  ['capture.step3Title', 'capture.step3'],
                ] as const
              ).map(([titleKey, descKey], i) => (
                <li key={titleKey} className="flex gap-3">
                  <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-ink">{i + 1}</span>
                  <div>
                    <p className="font-medium text-ink">{t(titleKey)}</p>
                    <p className="text-ink-muted">{t(descKey)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Notice tone="neutral" icon={<ShieldCheck className="text-ink-muted" />} title={t('capture.prototypeTitle')}>
            {t('capture.prototypeNote')}
          </Notice>
        </aside>
      </div>
    </>
  )
}

function ProcessingSteps({ phase }: { phase: Phase }) {
  const { t } = useI18n()
  const steps = [
    { key: 'saving', label: t('capture.stepSaving') },
    { key: 'extracting', label: t('capture.stepDrafting') },
  ]
  const idx = steps.findIndex((s) => s.key === phase)
  return (
    <div role="status" aria-live="polite" className="mt-4 rounded-card border border-line bg-surface p-4 shadow-card">
      <ul className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={s.key} className={cn('flex items-center gap-2.5 text-sm', i > idx ? 'text-ink-faint' : 'text-ink')}>
            {i < idx ? (
              <Check className="size-4 text-success" aria-hidden />
            ) : i === idx ? (
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
            ) : (
              <span className="size-4 rounded-full border border-line" aria-hidden />
            )}
            {s.label}
            {i < idx && <span className="sr-only">{t('capture.stepDone')}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
