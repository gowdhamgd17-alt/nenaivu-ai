import { FlaskConical, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { ActivityList } from '@/components/ActivityList'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { PageHeader } from '@/components/PageHeader'
import { useToast } from '@/components/Toaster'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { WorkspaceView } from '@/components/WorkspaceView'
import { AnswerLanguageSelect, VoiceLanguageSelect } from '@/features/voice/LanguageControls'
import { LANGS, type Lang } from '@/i18n/config'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { deleteAllData, prototypeControls } from '@/services/mock/mockApi'
import { useAppStore } from '@/store/AppStore'

export function SettingsPage() {
  const { user, workspaces, activeWorkspaceId, reload } = useAppStore()
  const { t } = useI18n()
  const ws = workspaces.find((w) => w.id === activeWorkspaceId)
  const toast = useToast()
  const [latency, setLatency] = useState(prototypeControls.latency)
  const [fail, setFail] = useState(prototypeControls.failNextRequests)
  const [resetOpen, setResetOpen] = useState(false)

  return (
    <>
      <PageHeader title={t('nav.settings')} description={t('settings.desc')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t('settings.language')} description={t('settings.languageDesc')} className="lg:col-span-2">
          <div className="grid gap-5 p-5 md:grid-cols-3">
            <InterfaceLanguageRadios />
            <VoiceLanguageSelect />
            <AnswerLanguageSelect />
          </div>
        </SectionCard>

        <SectionCard title={t('settings.workspace')} description={t('settings.workspaceDesc')}>
          <dl className="divide-y divide-line text-sm">
            <Row label={t('settings.name')} value={ws?.name} />
            <Row label={t('settings.description')} value={ws?.industry || undefined} />
            <Row label={t('settings.isolation')} value={t('settings.isolationValue')} />
          </dl>
        </SectionCard>

        <SectionCard title={t('settings.account')}>
          <dl className="divide-y divide-line text-sm">
            <Row label={t('settings.name')} value={user?.name || undefined} />
            <Row label={t('settings.email')} value={user?.email || undefined} />
            <Row label={t('settings.signIn')} value={t('settings.signInValue')} />
          </dl>
        </SectionCard>

        <SectionCard title={t('settings.prototype')} description={t('settings.prototypeDesc')} action={<FlaskConical className="size-4 shrink-0 text-primary" aria-hidden />}>
          <div className="divide-y divide-line">
            <Toggle
              id="latency"
              label={t('settings.latency')}
              hint={t('settings.latencyHint')}
              checked={latency}
              onChange={(v) => {
                prototypeControls.latency = v
                setLatency(v)
              }}
            />
            <Toggle
              id="fail"
              label={t('settings.fail')}
              hint={t('settings.failHint')}
              checked={fail}
              onChange={(v) => {
                prototypeControls.failNextRequests = v
                setFail(v)
              }}
            />
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{t('settings.reset')}</p>
                <p className="text-xs text-ink-muted">{t('settings.resetHint')}</p>
              </div>
              <Button variant="danger-outline" size="sm" onClick={() => setResetOpen(true)} className="self-start sm:self-auto">
                <RotateCcw aria-hidden /> {t('settings.resetButton')}
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('settings.activity')} description={t('settings.activityDesc')}>
          <WorkspaceView>
            {(data) => (
              <div className="max-h-96 overflow-y-auto">
                <ActivityList events={data.activity} />
              </div>
            )}
          </WorkspaceView>
        </SectionCard>
      </div>

      <ConfirmationDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('settings.resetTitle')}
        description={t('settings.resetDesc')}
        confirmLabel={t('settings.resetConfirm')}
        tone="danger"
        onConfirm={() => {
          deleteAllData()
          reload()
          toast({ tone: 'neutral', message: t('settings.resetToast') })
        }}
      />
    </>
  )
}

function InterfaceLanguageRadios() {
  const { t, lang, setLang } = useI18n()
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-sm font-medium text-ink">{t('settings.interfaceLanguage')}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(LANGS) as Lang[]).map((code) => (
          <label
            key={code}
            className={cn(
              'flex h-10 cursor-pointer items-center justify-center rounded-input border px-3 text-sm font-medium has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/15',
              lang === code ? 'border-primary bg-primary-soft/60 text-primary-ink' : 'border-line text-ink hover:bg-subtle',
            )}
          >
            <input type="radio" name="interface-language" value={code} checked={lang === code} onChange={() => setLang(code)} className="sr-only" />
            <span lang={LANGS[code].locale}>{LANGS[code].nativeName}</span>
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-muted">{t('language.savedNote')}</p>
    </fieldset>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink sm:col-span-2">{value ?? '—'}</dd>
    </div>
  )
}

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-hint`}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-line-strong'}`}
      >
        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-card transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}
