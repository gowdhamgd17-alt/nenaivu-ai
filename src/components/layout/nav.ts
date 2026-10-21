import { BookOpen, Building2, Inbox, LayoutDashboard, ListChecks, MessageSquareText, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Extra path prefixes that should mark this item active. */
  match: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', to: '/', icon: LayoutDashboard, match: [] },
  { label: 'Capture & Review', to: '/capture/review', icon: Inbox, match: ['/capture'] },
  { label: 'Business Memory', to: '/memory', icon: BookOpen, match: ['/memory'] },
  { label: 'Commitments', to: '/commitments', icon: ListChecks, match: ['/commitments'] },
  { label: 'Ask Nenaivu', to: '/ask', icon: MessageSquareText, match: ['/ask'] },
  { label: 'People & Organisations', to: '/people', icon: Building2, match: ['/people'] },
  { label: 'Settings', to: '/settings', icon: Settings, match: ['/settings'] },
]

export function isNavActive(item: NavItem, pathname: string) {
  if (item.to === '/') return pathname === '/'
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
