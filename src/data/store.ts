/**
 * Prototype data store: the app starts EMPTY and saves what you enter to this
 * browser's localStorage. There is no server yet — other browsers and devices
 * will not see this data, and clearing site data deletes it.
 */
import type { ActivityEvent, Capture, Commitment, Memory, Person, Proposal, User, Workspace } from '@/types/models'

export interface DataSnapshot {
  workspaces: Workspace[]
  users: User[]
  people: Person[]
  captures: Capture[]
  proposals: Proposal[]
  memories: Memory[]
  commitments: Commitment[]
  activity: ActivityEvent[]
}

/** Placeholder identity until sign-in exists. Shown without a personal name. */
export const CURRENT_USER: User = { id: 'u_owner', name: '', email: '', initials: '' }

const STORAGE_KEY = 'nenaivu.data.v1'

export function createEmptyData(): DataSnapshot {
  return {
    workspaces: [{ id: 'ws_main', name: 'My Workspace', industry: '' }],
    users: [CURRENT_USER],
    people: [],
    captures: [],
    proposals: [],
    memories: [],
    commitments: [],
    activity: [],
  }
}

function isSnapshot(v: unknown): v is DataSnapshot {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return ['workspaces', 'users', 'people', 'captures', 'proposals', 'memories', 'commitments', 'activity'].every((k) => Array.isArray(o[k])) &&
    (o.workspaces as unknown[]).length > 0
}

export function loadData(): DataSnapshot {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isSnapshot(parsed)) return parsed
    }
  } catch {
    // Unreadable or blocked storage: start empty.
  }
  return createEmptyData()
}

/** Returns false if the browser refused to save (storage full or blocked). */
export function saveData(data: DataSnapshot): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearData(): DataSnapshot {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  return createEmptyData()
}
