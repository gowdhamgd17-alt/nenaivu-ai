/**
 * Prototype data store. Data is kept per signed-in user in this browser's
 * localStorage (key includes the user id), so two mobile numbers signing in on
 * the same device never see each other's records. There is no server yet:
 * other devices will not see this data.
 */
import type { ActivityEvent, Capture, Commitment, ID, Memory, Person, Proposal, User, Workspace } from '@/types/models'

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

const keyFor = (userId: ID) => `nenaivu.data.v1.${userId}`

export function createEmptyData(user: User, workspaceName: string): DataSnapshot {
  return {
    workspaces: [{ id: 'ws_main', name: workspaceName || 'My Workspace', industry: '' }],
    users: [user],
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
  return (
    ['workspaces', 'users', 'people', 'captures', 'proposals', 'memories', 'commitments', 'activity'].every((k) => Array.isArray(o[k])) &&
    (o.workspaces as unknown[]).length > 0
  )
}

export function loadData(user: User, workspaceName: string): DataSnapshot {
  try {
    const raw = window.localStorage.getItem(keyFor(user.id))
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isSnapshot(parsed)) {
        // Keep the workspace name in step with the user's profile.
        parsed.workspaces[0] = { ...parsed.workspaces[0], name: workspaceName || parsed.workspaces[0].name }
        parsed.users = [user]
        return parsed
      }
    }
  } catch {
    // Unreadable or blocked storage: start empty.
  }
  return createEmptyData(user, workspaceName)
}

/** Returns false if the browser refused to save (storage full or blocked). */
export function saveData(userId: ID, data: DataSnapshot): boolean {
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearData(user: User, workspaceName: string): DataSnapshot {
  try {
    window.localStorage.removeItem(keyFor(user.id))
  } catch {
    // ignore
  }
  return createEmptyData(user, workspaceName)
}
