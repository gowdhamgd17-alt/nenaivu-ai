import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'
import { Dialog, SheetContent } from '../ui/dialog'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()
  const { t } = useI18n()

  // Move focus to main content and scroll to top on route change.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-input bg-surface px-3 py-2 text-sm font-medium shadow-pop focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('app.skipToContent')}
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-sidebar border-r border-line bg-surface lg:block">
        <AppSidebar />
      </aside>

      <Dialog open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent title={t('nav.sheetTitle')}>
          <AppSidebar onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Dialog>

      <div className="flex min-h-dvh flex-col lg:pl-sidebar">
        <AppHeader onOpenNav={() => setNavOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
