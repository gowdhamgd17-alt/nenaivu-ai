import { BookOpen, Building2, Inbox, LayoutDashboard, ListChecks, MessageSquareText, Settings, type LucideIcon } from 'lucide-react'
import type { MessageKey } from '@/i18n/messages/en'

export interface NavItem {
  labelKey: MessageKey
  to: string
  icon: LucideIcon
  /** Extra path prefixes that should mark this item active. */
  match: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.overview', to: '/', icon: LayoutDashboard, match: [] },
  { labelKey: 'nav.capture', to: '/capture/review', icon: Inbox, match: ['/capture'] },
  { labelKey: 'nav.memory', to: '/memory', icon: BookOpen, match: ['/memory'] },
  { labelKey: 'nav.commitments', to: '/commitments', icon: ListChecks, match: ['/commitments'] },
  { labelKey: 'nav.ask', to: '/ask', icon: MessageSquareText, match: ['/ask'] },
  { labelKey: 'nav.people', to: '/people', icon: Building2, match: ['/people'] },
  { labelKey: 'nav.settings', to: '/settings', icon: Settings, match: ['/settings'] },
]

export function isNavActive(item: NavItem, pathname: string) {
  if (item.to === '/') return pathname === '/'
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
