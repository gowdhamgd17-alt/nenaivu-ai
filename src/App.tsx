import { Compass } from 'lucide-react'
import { createHashRouter, Link, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { EmptyState } from '@/components/states'
import { ToastProvider } from '@/components/Toaster'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AskPage } from '@/pages/ask/AskPage'
import { CapturePage } from '@/pages/CapturePage'
import { CommitmentDetailPage } from '@/pages/CommitmentDetailPage'
import { CommitmentsPage } from '@/pages/CommitmentsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MemoryDetailPage, MemoryListPage } from '@/pages/MemoryPages'
import { PeopleListPage, PersonDetailPage } from '@/pages/PeoplePages'
import { ReviewInboxPage } from '@/pages/review/ReviewInboxPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { VoicePrefsProvider } from '@/features/voice/VoicePrefsProvider'
import { I18nProvider, useI18n } from '@/i18n/I18nProvider'
import { AppStoreProvider } from '@/store/AppStore'
import { Navigate, Outlet } from 'react-router-dom'

function Providers() {
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  )
}

function NotFound() {
  const { t } = useI18n()
  return (
    <Card>
      <EmptyState
        icon={<Compass />}
        title={t('notFound.title')}
        description={t('notFound.desc')}
        action={
          <Button asChild variant="secondary" size="sm">
            <Link to="/">{t('notFound.goOverview')}</Link>
          </Button>
        }
      />
    </Card>
  )
}

// Hash routing keeps the prototype working when served as a single static file.
// Switch to createBrowserRouter when deployed behind a server with SPA fallback.
const router = createHashRouter([
  {
    element: <Providers />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'capture', element: <Navigate to="/capture/review" replace /> },
          { path: 'capture/new', element: <CapturePage /> },
          { path: 'capture/review', element: <ReviewInboxPage /> },
          { path: 'capture/review/:proposalId', element: <ReviewInboxPage /> },
          { path: 'memory', element: <MemoryListPage /> },
          { path: 'memory/:id', element: <MemoryDetailPage /> },
          { path: 'commitments', element: <CommitmentsPage /> },
          { path: 'commitments/:id', element: <CommitmentDetailPage /> },
          { path: 'ask', element: <AskPage /> },
          { path: 'people', element: <PeopleListPage /> },
          { path: 'people/:id', element: <PersonDetailPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <I18nProvider>
      <VoicePrefsProvider>
        <AppStoreProvider>
          <RouterProvider router={router} />
        </AppStoreProvider>
      </VoicePrefsProvider>
    </I18nProvider>
  )
}
