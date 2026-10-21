import { useState, type ReactNode } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent } from './ui/dialog'
import { Field, Textarea } from './ui/form'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  tone?: 'primary' | 'danger'
  /** When set, shows an optional free-text reason field. */
  reasonLabel?: string
  onConfirm: (reason: string) => Promise<void> | void
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  reasonLabel,
  onConfirm,
}: ConfirmationDialogProps) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handle = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm(reason)
      setReason('')
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent
        title={title}
        description={description}
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={handle} loading={busy}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        {(reasonLabel || error) && (
          <div className="space-y-3">
            {reasonLabel && (
              <Field id="confirm-reason" label={reasonLabel} hint="Optional. Saved in the activity history.">
                <Textarea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={200} />
              </Field>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
