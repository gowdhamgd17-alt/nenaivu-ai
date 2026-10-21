import { Bell, Building, ChevronsUpDown, Inbox, Languages, ListChecks, LogOut, Menu, Plus, Search, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LANGS, type Lang } from '@/i18n/config'
import { useI18n } from '@/i18n/I18nProvider'
import { useAppStore } from '@/store/AppStore'
import { commitmentsByBucket, pendingProposals } from '@/store/selectors'
import { Button } from '../ui/button'
import { Dialog, DialogContent } from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown'
import { BrandMark } from './AppSidebar'
import { GlobalSearch } from './GlobalSearch'

export function AppHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { t } = useI18n()
  return (
    <header className="sticky top-0 z-30 flex h-header shrink-0 items-center gap-1.5 border-b border-line bg-surface/95 px-3 backdrop-blur-sm sm:gap-3 sm:px-4 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenNav} aria-label={t('nav.open')}>
        <Menu className="size-5!" />
      </Button>
      <Link to="/" className="flex items-center gap-2 lg:hidden" aria-label={t('app.home')}>
        <BrandMark className="size-6" />
      </Link>

      <GlobalSearch className="hidden max-w-md flex-1 md:block" />
      <div className="flex-1 md:hidden" />

      <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('header.search')} onClick={() => setSearchOpen(true)}>
        <Search className="size-5!" />
      </Button>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent title={t('header.search')} className="top-6 translate-y-0">
          <GlobalSearch autoFocus onDone={() => setSearchOpen(false)} className="pb-6" />
        </DialogContent>
      </Dialog>

      <div className="hidden flex-1 md:block" />
      <LanguageSwitcher className="hidden sm:inline-flex" />
      <WorkspaceSwitcher />
      <Notifications />
      <Button asChild size="sm" className="hidden sm:inline-flex lg:hidden">
        <Link to="/capture/new">
          <Plus aria-hidden /> {t('header.capture')}
        </Link>
      </Button>
      <Button asChild size="icon-sm" className="sm:hidden" aria-label={t('header.quickCapture')}>
        <Link to="/capture/new">
          <Plus />
        </Link>
      </Button>
      <UserMenu />
    </header>
  )
}

/** Option label: native name, plus the name in the current interface language when it differs. */
function useLanguageOptions() {
  const { t, lang } = useI18n()
  return (Object.keys(LANGS) as Lang[]).map((code) => {
    const native = LANGS[code].nativeName
    const local = t(`language.${code}`)
    return { code, label: native, sub: code === lang || native === local ? undefined : local }
  })
}

function LanguageRadioItems() {
  const options = useLanguageOptions()
  return (
    <>
      {options.map((o) => (
        <DropdownMenuRadioItem key={o.code} value={o.code} lang={LANGS[o.code].locale}>
          <span>
            {o.label}
            {o.sub && <span className="ml-1.5 text-xs text-ink-muted">· {o.sub}</span>}
          </span>
        </DropdownMenuRadioItem>
      ))}
    </>
  )
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, lang, setLang } = useI18n()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className} aria-label={t('language.switchLabel', { name: LANGS[lang].nativeName })}>
          <Languages aria-hidden />
          <span lang={LANGS[lang].locale}>{lang === 'ta' ? 'தமிழ்' : 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as Lang)}>
          <LanguageRadioItems />
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p className="px-2.5 py-1.5 text-xs text-ink-muted">{t('language.savedNote')}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, switchWorkspace } = useAppStore()
  const { t } = useI18n()
  const navigate = useNavigate()
  const active = workspaces.find((w) => w.id === activeWorkspaceId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 max-w-[180px] items-center gap-2 rounded-input border border-line bg-surface px-2.5 text-sm font-medium text-ink hover:bg-subtle sm:max-w-[220px]"
          aria-label={t('workspace.switchLabel', { name: active?.name ?? t('workspace.fallback') })}
        >
          <Building className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <span className="hidden truncate sm:inline">{active?.name ?? t('workspace.fallback')}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>{t('workspace.menuTitle')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeWorkspaceId ?? ''}
          onValueChange={(id) => {
            if (id === activeWorkspaceId) return
            switchWorkspace(id)
            navigate('/')
          }}
        >
          {workspaces.map((w) => (
            <DropdownMenuRadioItem key={w.id} value={w.id}>
              <div className="min-w-0">
                <p className="truncate">{w.name}</p>
                <p className="truncate text-xs text-ink-muted">{w.industry}</p>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <p className="px-2.5 py-1.5 text-xs text-ink-muted">{t('workspace.isolationNote')}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Notifications() {
  const { data } = useAppStore()
  const { t } = useI18n()
  const navigate = useNavigate()
  const overdue = data ? commitmentsByBucket(data, 'overdue') : []
  const today = data ? commitmentsByBucket(data, 'today') : []
  const pending = data ? pendingProposals(data) : []
  const count = overdue.length + today.length + (pending.length ? 1 : 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={count ? t('notifications.labelCount', { count }) : t('notifications.label')}>
          <Bell className="size-5!" />
          {count > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-surface" aria-hidden />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-w-[calc(100vw-1.5rem)]">
        <DropdownMenuLabel>{t('notifications.title')}</DropdownMenuLabel>
        {count === 0 && <p className="px-2.5 py-4 text-center text-sm text-ink-muted">{t('notifications.empty')}</p>}
        {pending.length > 0 && (
          <DropdownMenuItem onSelect={() => navigate('/capture/review')}>
            <Inbox />
            <span className="flex-1">{t('notifications.pending', { count: pending.length })}</span>
          </DropdownMenuItem>
        )}
        {[...overdue, ...today].slice(0, 5).map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => navigate(`/commitments/${c.id}`)}>
            <ListChecks className={overdue.includes(c) ? 'text-danger!' : 'text-warning!'} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{c.title}</span>
              <span className="text-xs text-ink-muted">{overdue.includes(c) ? t('notifications.overdue') : t('notifications.dueToday')}</span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2.5 py-1.5 text-xs text-ink-muted">{t('notifications.note')}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu() {
  const { user } = useAppStore()
  const { t, lang, setLang } = useI18n()
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white"
          aria-label={t('user.menuLabel', { name: user?.name ?? '' })}
        >
          {user?.initials ?? '··'}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="px-2.5 py-2">
          <p className="text-sm font-medium text-ink">{user?.name}</p>
          <p className="text-xs text-ink-muted">
            {user?.email} · {t('user.mockUser')}
          </p>
        </div>
        <DropdownMenuSeparator />
        {/* Language is always reachable here, including on phones where the header button is hidden. */}
        <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as Lang)}>
          <LanguageRadioItems />
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings /> {t('nav.settings')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <LogOut /> {t('user.signOut')} <span className="ml-auto text-xs">{t('user.notAvailable')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
