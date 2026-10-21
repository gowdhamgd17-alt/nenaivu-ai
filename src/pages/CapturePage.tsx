import { AlertTriangle, Check, FileText, Loader2, Mic, Paperclip, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaptureTabs } from '@/components/CaptureTabs'
import { PageHeader } from '@/components/PageHeader'
import { Notice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label, Textarea } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/AppStore'

const MAX_CHARS = 5000
const MIN_CHARS = 10
const MAX_FILE_BYTES = 1_000_000
const SUPPORTED_EXT = ['txt', 'md', 'csv']

const EXAMPLES = [
  'Call with Priya Raman from Lotus Apparel. She confirmed the spring order will be 1,500 m, not 1,200 m. We need to send the revised quote tomorrow. Priya will share the final colour cards next week.',
  'Spoke to Arjun at Northwind Logistics. The corrected freight invoice is delayed. He promised to send it within 3 days.',
]

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
    if (!trimmed) return file ? 'This file is empty.' : 'Write or paste something to capture.'
    if (trimmed.length < MIN_CHARS) return `Add a little more detail — at least ${MIN_CHARS} characters.`
    if (content.length > MAX_CHARS) return `Captures are limited to ${MAX_CHARS.toLocaleString()} characters.`
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
      setServiceError(err instanceof Error ? err.message : 'The capture could not be processed.')
    }
  }

  const onPickFile = async (f: File | undefined) => {
    setFileError(null)
    setServiceError(null)
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!SUPPORTED_EXT.includes(ext)) {
      setFileError(`“${f.name}” can't be read yet. This prototype supports .txt, .md and .csv files.`)
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError(`“${f.name}” is larger than 1 MB.`)
      return
    }
    try {
      const content = await f.text()
      if (content.length > MAX_CHARS) {
        setFileError(`“${f.name}” has ${content.length.toLocaleString()} characters; the limit is ${MAX_CHARS.toLocaleString()}.`)
        return
      }
      setFile({ name: f.name, size: f.size, content })
      setFieldError(null)
    } catch {
      setFileError(`“${f.name}” could not be read.`)
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <>
      <PageHeader title="Capture & Review" description="Write down what happened. Nenaivu proposes records; you decide what is remembered." />
      <CaptureTabs />

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="lg:col-span-2" noValidate aria-busy={busy}>
          <Card className="overflow-hidden">
            <div className="space-y-4 p-5 sm:p-6">
              {!file ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <Label htmlFor={ids.text}>What happened?</Label>
                    <span
                      id={ids.counter}
                      className={cn('tabular text-xs', remaining < 0 ? 'text-danger' : remaining < 300 ? 'text-warning' : 'text-ink-muted')}
                      aria-live={remaining < 300 ? 'polite' : 'off'}
                    >
                      {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
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
                    placeholder="e.g. Call with Priya from Lotus Apparel — we promised revised samples by 28 Oct. She mentioned their budget is approved for Q4."
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
                      Meeting notes, calls, emails, WhatsApp messages — paste as-is. The original is kept exactly as written.
                    </p>
                  )}
                  {!text && !busy && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-ink-muted">Try an example:</span>
                      {EXAMPLES.map((ex, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setText(ex)}
                          className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-muted hover:border-line-strong hover:text-ink"
                        >
                          {i === 0 ? 'Customer call' : 'Supplier update'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-ink">Attached file</p>
                  <div className="rounded-input border border-line">
                    <div className="flex items-center gap-3 border-b border-line px-3 py-2.5">
                      <FileText className="size-4 text-ink-muted" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                        <p className="text-xs text-ink-muted">
                          {(file.size / 1024).toFixed(1)} KB · {file.content.length.toLocaleString()} characters · read in your browser
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => setFile(null)} disabled={busy} aria-label={`Remove ${file.name}`}>
                        <X />
                      </Button>
                    </div>
                    <pre className="max-h-56 overflow-auto px-3 py-2.5 font-mono text-xs whitespace-pre-wrap text-ink-muted">{file.content || '(empty file)'}</pre>
                  </div>
                </div>
              )}

              <div className="rounded-input border border-dashed border-line-strong bg-canvas px-4 py-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">Or capture from a file</p>
                    <p id={`${ids.file}-hint`} className="mt-0.5 text-xs text-ink-muted">
                      Supported now: <strong className="font-medium text-ink">.txt, .md, .csv</strong> up to 1 MB. PDF, Word and images are not supported yet. Files are read locally and not uploaded anywhere.
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
                    <Paperclip aria-hidden /> {file ? 'Replace file' : 'Choose file'}
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
                  title="Capture was not processed"
                  action={
                    <Button type="submit" size="sm" variant="secondary">
                      Try again
                    </Button>
                  }
                >
                  {serviceError} Your text is still here.
                </Notice>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-line bg-canvas px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <Button type="button" variant="ghost" size="sm" disabled title="Voice capture is planned for a later release" className="justify-start">
                <Mic aria-hidden /> Voice note <span className="text-xs font-normal">(coming later)</span>
              </Button>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-ink-faint sm:inline">Ctrl / ⌘ + Enter</span>
                <Button type="submit" loading={busy} disabled={status !== 'ready'} className="w-full sm:w-auto">
                  {!busy && <Sparkles aria-hidden />}
                  {busy ? 'Organising…' : 'Save & Organise'}
                </Button>
              </div>
            </div>
          </Card>

          {busy && <ProcessingSteps phase={phase} />}
        </form>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">What happens next</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {[
                ['Saved as-is', 'Your original text is stored unchanged as the source.'],
                ['Proposals drafted', 'Commitments, people and facts are suggested from it.'],
                ['You confirm', 'Nothing becomes memory or a commitment until you approve it.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-ink">{i + 1}</span>
                  <div>
                    <p className="font-medium text-ink">{t}</p>
                    <p className="text-ink-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Notice tone="neutral" icon={<ShieldCheck className="text-ink-muted" />} title="Prototype processing">
            Extraction is simulated with simple rules, not AI. Unclear dates are flagged for you to resolve rather than guessed. Data stays in this browser tab.
          </Notice>
        </aside>
      </div>
    </>
  )
}

function ProcessingSteps({ phase }: { phase: Phase }) {
  const steps = [
    { key: 'saving', label: 'Saving the original text' },
    { key: 'extracting', label: 'Drafting proposals (simulated)' },
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
            {i < idx && <span className="sr-only">(done)</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
