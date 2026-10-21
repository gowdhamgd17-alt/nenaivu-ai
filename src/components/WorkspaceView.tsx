import type { ReactNode } from 'react'
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
  if (status === 'error') {
    return (
      <Card>
        <ErrorState message={error ?? 'Unknown error.'} onRetry={reload} />
      </Card>
    )
  }
  if (!data) {
    return (
      loading ?? (
        <Card>
          <LoadingState label="Loading workspace" rows={4} />
        </Card>
      )
    )
  }
  return <>{children(data)}</>
}
