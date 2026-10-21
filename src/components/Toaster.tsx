import { CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'
import { createId } from '@/lib/utils'

interface Toast {
  id: string
  message: string
  tone: 'success' | 'neutral'
  link?: { to: string; label: string }
}

const ToastContext = createContext<(t: Omit<Toast, 'id'>) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const { t: tr } = useI18n()
  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = createId('t')
      setToasts((list) => [...list.slice(-2), { ...t, id }])
      setTimeout(() => dismiss(id), 5000)
    },
    [dismiss],
  )
  const value = useMemo(() => push, [push])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
        {toasts.map((t) => (
          <div key={t.id} role="status" className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-pop">
            {t.tone === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />}
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-ink">{t.message}</p>
              {t.link && (
                <Link to={t.link.to} onClick={() => dismiss(t.id)} className="mt-0.5 inline-block font-medium text-primary hover:underline">
                  {t.link.label}
                </Link>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-ink-faint hover:text-ink" aria-label={tr('toast.dismiss')}>
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
