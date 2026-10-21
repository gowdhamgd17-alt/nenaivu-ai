import { FlaskConical, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { ActivityList } from '@/components/ActivityList'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { PageHeader } from '@/components/PageHeader'
import { useToast } from '@/components/Toaster'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { WorkspaceView } from '@/components/WorkspaceView'
import { prototypeControls, resetMockData } from '@/services/mock/mockApi'
import { useAppStore } from '@/store/AppStore'

export function SettingsPage() {
  const { user, workspaces, activeWorkspaceId, reload } = useAppStore()
  const ws = workspaces.find((w) => w.id === activeWorkspaceId)
  const toast = useToast()
  const [latency, setLatency] = useState(prototypeControls.latency)
  const [fail, setFail] = useState(prototypeControls.failNextRequests)
  const [resetOpen, setResetOpen] = useState(false)

  return (
    <>
      <PageHeader title="Settings" description="Workspace, account and prototype controls." />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Workspace" description="Switch workspaces from the header.">
          <dl className="divide-y divide-line text-sm">
            <Row label="Name" value={ws?.name} />
            <Row label="Description" value={ws?.industry} />
            <Row label="Data isolation" value="Records are loaded per workspace and never shown in another." />
          </dl>
        </SectionCard>

        <SectionCard title="Account">
          <dl className="divide-y divide-line text-sm">
            <Row label="Name" value={user?.name} />
            <Row label="Email" value={user?.email} />
            <Row label="Sign-in" value="Not connected — prototype uses a mock user." />
          </dl>
        </SectionCard>

        <SectionCard
          title="Prototype controls"
          description="For testing loading and error states. These do not exist in the real product."
          action={<FlaskConical className="size-4 text-primary" aria-hidden />}
        >
          <div className="divide-y divide-line">
            <Toggle
              id="latency"
              label="Simulate network latency"
              hint="Adds realistic delays so loading states are visible."
              checked={latency}
              onChange={(v) => {
                prototypeControls.latency = v
                setLatency(v)
              }}
            />
            <Toggle
              id="fail"
              label="Make service requests fail"
              hint="Capture, approval, Ask and reloads will return an error until switched off."
              checked={fail}
              onChange={(v) => {
                prototypeControls.failNextRequests = v
                setFail(v)
              }}
            />
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Reset sample data</p>
                <p className="text-xs text-ink-muted">Restores the original mock records in every workspace.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setResetOpen(true)}>
                <RotateCcw aria-hidden /> Reset
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Activity history" description="Approvals, rejections and status changes in this workspace">
          <WorkspaceView>{(data) => <div className="max-h-96 overflow-y-auto"><ActivityList events={data.activity} /></div>}</WorkspaceView>
        </SectionCard>
      </div>

      <ConfirmationDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset sample data?"
        description="Everything you captured, approved or changed in this session will be discarded."
        confirmLabel="Reset data"
        tone="danger"
        onConfirm={() => {
          resetMockData()
          reload()
          toast({ tone: 'neutral', message: 'Sample data restored.' })
        }}
      />
    </>
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
      <div>
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
