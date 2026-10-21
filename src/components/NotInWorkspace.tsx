import { SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from './states'
import { Button } from './ui/button'
import { Card } from './ui/card'

/** Shown when a detail URL points to a record that is not in the active workspace. */
export function NotInWorkspace({ kind, back }: { kind: string; back: { to: string; label: string } }) {
  return (
    <Card>
      <EmptyState
        icon={<SearchX />}
        title={`This ${kind} isn't in the current workspace`}
        description="It may have been opened from another workspace, or it doesn't exist."
        action={
          <Button asChild variant="secondary" size="sm">
            <Link to={back.to}>{back.label}</Link>
          </Button>
        }
      />
    </Card>
  )
}
