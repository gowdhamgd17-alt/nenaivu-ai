import { SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'
import { EmptyState } from './states'
import { Button } from './ui/button'
import { Card } from './ui/card'

/** Shown when a detail URL points to a record that is not in the active workspace. */
export function NotInWorkspace({ kind, back }: { kind: 'commitment' | 'memory' | 'contact'; back: { to: string; label: string } }) {
  const { t } = useI18n()
  return (
    <Card>
      <EmptyState
        icon={<SearchX />}
        title={t(`notInWorkspace.${kind}`)}
        description={t('notInWorkspace.desc')}
        action={
          <Button asChild variant="secondary" size="sm">
            <Link to={back.to}>{back.label}</Link>
          </Button>
        }
      />
    </Card>
  )
}
