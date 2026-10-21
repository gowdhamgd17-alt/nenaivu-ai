import { ArrowLeft, BookOpen, CheckCircle2, FlaskConical, ListChecks, Mic } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { BrandMark } from '@/components/layout/AppSidebar'
import { Notice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/form'
import { LANGS, type Lang } from '@/i18n/config'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { auth, AuthError, formatIndianMobile, normaliseIndianMobile, type OtpChallenge } from '@/services/auth'
import { useAuth } from './AuthProvider'

/** Shared frame: product panel on wide screens, form card, language switch. */
function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const points = [
    { icon: <Mic />, key: 'auth.point1' },
    { icon: <CheckCircle2 />, key: 'auth.point2' },
    { icon: <ListChecks />, key: 'auth.point3' },
  ] as const
  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="hidden w-[440px] shrink-0 flex-col justify-between border-r border-line bg-surface p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Nenaivu AI</span>
        </div>
        <div>
          <p className="text-2xl leading-snug font-semibold tracking-tight text-balance text-ink">{t('auth.tagline')}</p>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p.key} className="flex gap-3 text-sm text-ink-muted">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary [&_svg]:size-4" aria-hidden>
                  {p.icon}
                </span>
                <span className="pt-1.5">{t(p.key)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-xs text-ink-faint">
          <BookOpen className="size-3.5" aria-hidden /> {t('auth.principle')}
        </p>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:invisible">
            <BrandMark className="size-6" />
            <span className="text-sm font-semibold text-ink">Nenaivu AI</span>
          </div>
          <LanguageToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </main>
    </div>
  )
}

function LanguageToggle() {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t('language.label')} className="flex rounded-input border border-line bg-surface p-0.5 text-sm">
      {(Object.keys(LANGS) as Lang[]).map((code) => (
        <button
          key={code}
          type="button"
          lang={LANGS[code].locale}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={cn('rounded-[6px] px-3 py-1.5 font-medium transition-colors', lang === code ? 'bg-primary-soft text-primary-ink' : 'text-ink-muted hover:text-ink')}
        >
          {LANGS[code].nativeName}
        </button>
      ))}
    </div>
  )
}

function TestModeNotice() {
  const { t } = useI18n()
  if (!auth.testMode) return null
  return (
    <Notice tone="warning" icon={<FlaskConical />} title={t('auth.testModeTitle')} className="mb-6">
      {t('auth.testModeBody', { code: auth.testCode ?? '' })}
    </Notice>
  )
}

function authErrorText(e: unknown, t: ReturnType<typeof useI18n>['t']) {
  if (e instanceof AuthError) {
    if (e.code === 'wrong_code') return t('auth.err.wrong_code', { count: e.attemptsLeft ?? 0 })
    return t(`auth.err.${e.code}`)
  }
  return t('auth.err.unknown')
}

// ── Step 1: mobile number ───────────────────────────────────────────────────

function PhoneStep({ initial, onSent }: { initial: string; onSent: (c: OtpChallenge, national: string) => void }) {
  const { t } = useI18n()
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const id = useId()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const parsed = normaliseIndianMobile(value)
    if (!parsed.ok) {
      setError(t(`auth.err.${parsed.error}`))
      return
    }
    setBusy(true)
    setError(null)
    try {
      onSent(await auth.sendOtp(parsed.e164), parsed.national)
    } catch (err) {
      setError(authErrorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="text-2xl font-semibold tracking-tight text-balance text-ink">{t('auth.signInTitle')}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t('auth.signInDesc')}</p>
      <div className="mt-6">
        <TestModeNotice />
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {t('auth.mobileLabel')}
        </label>
        <div className="mt-1.5 flex gap-2">
          <span
            className="flex h-12 shrink-0 items-center rounded-input border border-line bg-subtle px-3 text-[15px] font-medium text-ink"
            aria-label={t('auth.countryCode')}
          >
            🇮🇳 +91
          </span>
          <Input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            autoFocus
            maxLength={14}
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^\d\s+-]/g, ''))
              setError(null)
            }}
            placeholder={t('auth.mobilePlaceholder')}
            aria-invalid={!!error}
            aria-describedby={`${id}-msg`}
            className="tabular h-12 text-[17px] tracking-wide"
          />
        </div>
        <p id={`${id}-msg`} role={error ? 'alert' : undefined} className={cn('mt-1.5 text-xs', error ? 'text-danger' : 'text-ink-muted')}>
          {error ?? t('auth.mobileHint')}
        </p>
      </div>
      <Button type="submit" size="lg" loading={busy} className="mt-6 h-12 w-full text-[15px]">
        {busy ? t('auth.sending') : t('auth.sendCode')}
      </Button>
      <p className="mt-4 text-xs leading-relaxed text-ink-faint">{t('auth.consent')}</p>
    </form>
  )
}

// ── Step 2: one-time code ───────────────────────────────────────────────────

function OtpStep({ challenge: initialChallenge, onBack }: { challenge: OtpChallenge; onBack: () => void }) {
  const { t } = useI18n()
  const { completeSignIn } = useAuth()
  const [challenge, setChallenge] = useState(initialChallenge)
  const len = challenge.codeLength
  const [digits, setDigits] = useState<string[]>(() => Array(len).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [locked, setLocked] = useState(false)
  const [wait, setWait] = useState(challenge.resendAfter)
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const verifying = useRef(false)

  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  useEffect(() => refs.current[0]?.focus(), [])

  const verify = async (code: string) => {
    if (verifying.current || locked) return
    verifying.current = true
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      completeSignIn(await auth.verifyOtp(challenge.challengeId, code))
    } catch (e) {
      setError(authErrorText(e, t))
      if (e instanceof AuthError && (e.code === 'too_many_attempts' || e.code === 'code_expired')) setLocked(true)
      setDigits(Array(len).fill(''))
      refs.current[0]?.focus()
    } finally {
      verifying.current = false
      setBusy(false)
    }
  }

  const setAt = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, '')
    if (!incoming) {
      setDigits((d) => d.map((x, i) => (i === index ? '' : x)))
      return
    }
    // Typing or OS autofill may deliver several digits at once.
    const next = [...digits]
    for (let k = 0; k < incoming.length && index + k < len; k++) next[index + k] = incoming[k]
    setDigits(next)
    setError(null)
    const focusIdx = Math.min(index + incoming.length, len - 1)
    refs.current[focusIdx]?.focus()
    if (next.every(Boolean)) void verify(next.join(''))
  }

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      setDigits((d) => d.map((x, k) => (k === i - 1 ? '' : x)))
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    else if (e.key === 'ArrowRight' && i < len - 1) refs.current[i + 1]?.focus()
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, len)
    if (!pasted) return
    e.preventDefault()
    setAt(0, pasted)
  }

  const resend = async () => {
    setError(null)
    try {
      const c = await auth.sendOtp(challenge.phone)
      setChallenge(c)
      setWait(c.resendAfter)
      setLocked(false)
      setDigits(Array(len).fill(''))
      setInfo(t('auth.codeResent'))
      refs.current[0]?.focus()
    } catch (e) {
      setError(authErrorText(e, t))
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (digits.every(Boolean)) void verify(digits.join(''))
      }}
      noValidate
    >
      <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 rounded-sm text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {t('auth.changeNumber')}
      </button>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('auth.otpTitle')}</h1>
      <p className="tabular mt-2 text-sm text-ink-muted">{t('auth.otpSentTo', { phone: formatIndianMobile(challenge.phone) })}</p>

      <div className="mt-6">
        <TestModeNotice />
        <fieldset>
          <legend className="sr-only">{t('auth.otpLabel')}</legend>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${len}, minmax(0, 1fr))` }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el
                }}
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                onPaste={onPaste}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={i === 0 ? len : 1}
                disabled={busy || locked}
                aria-label={t('auth.otpDigit', { index: i + 1, total: len })}
                aria-invalid={!!error}
                className={cn(
                  'tabular h-14 w-full min-w-0 rounded-input border bg-surface text-center text-2xl font-semibold text-ink shadow-card transition-colors focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 focus-visible:outline-none disabled:bg-subtle',
                  error ? 'border-danger' : d ? 'border-line-strong' : 'border-line',
                )}
              />
            ))}
          </div>
        </fieldset>
        <p role={error ? 'alert' : 'status'} className={cn('mt-2 min-h-5 text-xs', error ? 'text-danger' : 'text-success')}>
          {error ?? info}
        </p>
      </div>

      <Button type="submit" size="lg" loading={busy} disabled={locked || !digits.every(Boolean)} className="mt-4 h-12 w-full text-[15px]">
        {busy ? t('auth.verifying') : t('auth.verify')}
      </Button>

      <div className="mt-4 text-center text-sm">
        {wait > 0 ? (
          <span className="tabular text-ink-muted">{t('auth.resendIn', { seconds: wait })}</span>
        ) : (
          <button type="button" onClick={() => void resend()} className="font-medium text-primary hover:underline">
            {t('auth.resend')}
          </button>
        )}
      </div>
    </form>
  )
}

// ── Step 3: first-time profile ──────────────────────────────────────────────

export function ProfileForm({ initial, submitLabel, onSave }: { initial: { name: string; business: string }; submitLabel: string; onSave: (p: { name: string; business: string }) => void }) {
  const { t } = useI18n()
  const [name, setName] = useState(initial.name)
  const [business, setBusiness] = useState(initial.business)
  const [showError, setShowError] = useState(false)
  const nameOk = name.trim().length >= 2
  const ids = { name: useId(), business: useId() }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!nameOk) {
          setShowError(true)
          return
        }
        onSave({ name, business })
      }}
      noValidate
      className="space-y-4"
    >
      <Field id={ids.name} label={t('auth.nameLabel')} error={showError && !nameOk ? t('auth.nameError') : undefined}>
        <Input
          id={ids.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={60}
          placeholder={t('auth.namePlaceholder')}
          aria-invalid={showError && !nameOk}
          className="h-11"
        />
      </Field>
      <Field id={ids.business} label={t('auth.businessLabel')} hint={t('auth.businessHint')}>
        <Input
          id={ids.business}
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          autoComplete="organization"
          maxLength={80}
          placeholder={t('auth.businessPlaceholder')}
          aria-describedby={`${ids.business}-hint`}
          className="h-11"
        />
      </Field>
      <Button type="submit" size="lg" className="h-12 w-full text-[15px]">
        {submitLabel}
      </Button>
    </form>
  )
}

function ProfileStep() {
  const { t } = useI18n()
  const { saveProfile } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('auth.profileTitle')}</h1>
      <p className="mt-2 mb-6 text-sm text-ink-muted">{t('auth.profileDesc')}</p>
      <ProfileForm initial={{ name: '', business: '' }} submitLabel={t('auth.getStarted')} onSave={saveProfile} />
    </div>
  )
}

/** Shows sign-in screens until the user is signed in and has a profile. */
export function AuthGate({ children }: { children: (userKey: string) => ReactNode }) {
  const { status, session, profile } = useAuth()
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null)
  const [lastNumber, setLastNumber] = useState('')

  // After signing out, always start again from the mobile-number step.
  useEffect(() => {
    if (status === 'signedOut') setChallenge(null)
  }, [status])

  if (status === 'signedIn' && session && profile) {
    // Remount the app per user and profile so no state leaks between logins.
    return <>{children(`${session.userId}|${profile.name}|${profile.business}`)}</>
  }

  return (
    <AuthLayout>
      {status === 'needsProfile' ? (
        <ProfileStep />
      ) : challenge ? (
        <OtpStep challenge={challenge} onBack={() => setChallenge(null)} />
      ) : (
        <PhoneStep
          initial={lastNumber}
          onSent={(c, national) => {
            setLastNumber(national)
            setChallenge(c)
          }}
        />
      )}
    </AuthLayout>
  )
}
