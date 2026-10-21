import { Bell, Building, ChevronsUpDown, Inbox, ListChecks, LogOut, Menu, Plus, Search, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { pluralise } from '@/lib/utils'
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
  return (
    <header className="sticky top-0 z-30 flex h-header shrink-0 items-center gap-2 border-b border-line bg-surface/95 px-4 backdrop-blur-sm sm:gap-3 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenNav} aria-label="Open navigation">
        <Menu className="size-5!" />
      </Button>
      <Link to="/" className="flex items-center gap-2 lg:hidden" aria-label="Nenaivu AI home">
        <BrandMark className="size-6" />
      </Link>

      <GlobalSearch className="hidden max-w-md flex-1 md:block" />
      <div className="flex-1 md:hidden" />

      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" onClick={() => setSearchOpen(true)}>
        <Search className="size-5!" />
      </Button>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent title="Search" className="top-6 translate-y-0">
          <GlobalSearch autoFocus onDone={() => setSearchOpen(false)} className="pb-6" />
        </DialogContent>
      </Dialog>

      <div className="hidden flex-1 md:block" />
      <WorkspaceSwitcher />
      <Notifications />
      <Button asChild size="sm" className="hidden sm:inline-flex lg:hidden">
        <Link to="/capture/new">
          <Plus aria-hidden /> Capture
        </Link>
      </Button>
      <Button asChild size="icon-sm" className="sm:hidden" aria-label="Quick capture">
        <Link to="/capture/new">
          <Plus />
        </Link>
      </Button>
      <UserMenu />
    </header>
  )
}

function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, switchWorkspace } = useAppStore()
  const navigate = useNavigate()
  const active = workspaces.find((w) => w.id === activeWorkspaceId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 max-w-[180px] items-center gap-2 rounded-input border border-line bg-surface px-2.5 text-sm font-medium text-ink hover:bg-subtle sm:max-w-[220px]"
          aria-label={`Workspace: ${active?.name ?? 'none'}. Switch workspace`}
        >
          <Building className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <span className="hidden truncate sm:inline">{active?.name ?? 'Workspace'}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Workspaces (mock)</DropdownMenuLabel>
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
        <p className="px-2.5 py-1.5 text-xs text-ink-muted">Each workspace's data is loaded separately and never shown in another.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Notifications() {
  const { data } = useAppStore()
  const navigate = useNavigate()
  const overdue = data ? commitmentsByBucket(data, 'overdue') : []
  const today = data ? commitmentsByBucket(data, 'today') : []
  const pending = data ? pendingProposals(data) : []
  const count = overdue.length + today.length + (pending.length ? 1 : 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${count ? `, ${count} items` : ''}`}>
          <Bell className="size-5!" />
          {count > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-surface" aria-hidden />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel>Needs attention</DropdownMenuLabel>
        {count === 0 && <p className="px-2.5 py-4 text-center text-sm text-ink-muted">Nothing needs attention right now.</p>}
        {pending.length > 0 && (
          <DropdownMenuItem onSelect={() => navigate('/capture/review')}>
            <Inbox />
            <span className="flex-1">{pluralise(pending.length, 'proposal')} awaiting confirmation</span>
          </DropdownMenuItem>
        )}
        {[...overdue, ...today].slice(0, 5).map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => navigate(`/commitments/${c.id}`)}>
            <ListChecks className={overdue.includes(c) ? 'text-danger!' : 'text-warning!'} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{c.title}</span>
              <span className="text-xs text-ink-muted">{overdue.includes(c) ? 'Overdue' : 'Due today'}</span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2.5 py-1.5 text-xs text-ink-muted">Derived from your records. Reminders and push alerts are not connected in this prototype.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu() {
  const { user } = useAppStore()
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white"
          aria-label={`Account menu for ${user?.name ?? 'user'}`}
        >
          {user?.initials ?? '··'}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-2.5 py-2">
          <p className="text-sm font-medium text-ink">{user?.name}</p>
          <p className="text-xs text-ink-muted">{user?.email} · mock user</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <LogOut /> Sign out <span className="ml-auto text-xs">Not available</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
