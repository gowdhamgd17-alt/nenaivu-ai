import type { ReactNode } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import type { WorkspaceData } from '@/services'
import { useAppStore } from '@/store/AppStore'
import { Card } from './ui/card'
import { ErrorState, LoadingState } from './states'

interface WorkspaceViewProps {
  children: (data: WorkspaceData) => ReactNode
  /** Custom skeleton for this page; defaults to a card of rows. */
  loading?: ReactNode
}

/** Renders loading / error states until the active workspace's data is available. */
export function WorkspaceView({ children, loading }: WorkspaceViewProps) {
  const { data, status, error, reload } = useAppStore()
  const { t } = useI18n()
  if (status === 'error') {
    return (
      <Card>
        <ErrorState message={t(`error.${error ?? 'unknown'}`)} onRetry={reload} />
      </Card>
    )
  }
  if (!data) {
    return (
      loading ?? (
        <Card>
          <LoadingState label={t('state.loadingWorkspace')} rows={4} />
        </Card>
      )
    )
  }
  return <>{children(data)}</>
}
