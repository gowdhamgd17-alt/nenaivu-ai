import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  api,
  type ApprovalInput,
  type CommitmentUpdate,
  type CreateCaptureInput,
  type WorkspaceData,
} from '@/services'
import type { ID, User, Workspace } from '@/types/models'

type LoadStatus = 'loading' | 'ready' | 'error'

interface AppStoreValue {
  user: User | null
  workspaces: Workspace[]
  activeWorkspaceId: ID | null
  status: LoadStatus
  error: string | null
  /** Data for the active workspace only. */
  data: WorkspaceData | null
  switchWorkspace: (id: ID) => void
  reload: () => void
  createCapture: (input: Omit<CreateCaptureInput, 'workspaceId'>) => ReturnType<typeof api.createCapture>
  approveProposal: (proposalId: ID, input: ApprovalInput) => ReturnType<typeof api.approveProposal>
  rejectProposal: (proposalId: ID, reason?: string) => ReturnType<typeof api.rejectProposal>
  updateCommitment: (id: ID, update: CommitmentUpdate) => ReturnType<typeof api.updateCommitment>
  ask: (question: string) => ReturnType<typeof api.ask>
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

const upsert = <T extends { id: ID }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<ID | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<WorkspaceData | null>(null)
  const loadToken = useRef(0)

  const load = useCallback(async (workspaceId: ID) => {
    const token = ++loadToken.current
    setStatus('loading')
    setError(null)
    // Clear previous workspace data immediately so nothing leaks across workspaces.
    setData((prev) => (prev?.workspace.id === workspaceId ? prev : null))
    try {
      const result = await api.loadWorkspace(workspaceId)
      if (token !== loadToken.current) return
      setData(result)
      setStatus('ready')
    } catch (e) {
      if (token !== loadToken.current) return
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const [u, ws] = await Promise.all([api.getCurrentUser(), api.listWorkspaces()])
      setUser(u)
      setWorkspaces(ws)
      setActiveWorkspaceId(ws[0]?.id ?? null)
      if (ws[0]) void load(ws[0].id)
    })()
  }, [load])

  const requireWs = useCallback(() => {
    if (!activeWorkspaceId) throw new Error('No active workspace.')
    return activeWorkspaceId
  }, [activeWorkspaceId])

  /** Applies a mutation result only if the user is still in the same workspace. */
  const patch = useCallback((workspaceId: ID, fn: (d: WorkspaceData) => WorkspaceData) => {
    setData((d) => (d && d.workspace.id === workspaceId ? fn(d) : d))
  }, [])

  const value = useMemo<AppStoreValue>(
    () => ({
      user,
      workspaces,
      activeWorkspaceId,
      status,
      error,
      data,
      switchWorkspace: (id) => {
        if (id === activeWorkspaceId) return
        setActiveWorkspaceId(id)
        void load(id)
      },
      reload: () => activeWorkspaceId && void load(activeWorkspaceId),
      createCapture: async (input) => {
        const ws = requireWs()
        const result = await api.createCapture({ ...input, workspaceId: ws })
        patch(ws, (d) => ({
          ...d,
          captures: [result.capture, ...d.captures],
          proposals: [...result.proposals, ...d.proposals],
          activity: [result.activity, ...d.activity],
        }))
        return result
      },
      approveProposal: async (proposalId, input) => {
        const ws = requireWs()
        const result = await api.approveProposal(ws, proposalId, input)
        patch(ws, (d) => {
          const next = { ...d, proposals: upsert(d.proposals, result.proposal), activity: [result.activity, ...d.activity] }
          if (result.record.type === 'commitment') next.commitments = upsert(d.commitments, result.record.value)
          if (result.record.type === 'memory') next.memories = upsert(d.memories, result.record.value)
          if (result.record.type === 'person') next.people = [...d.people, result.record.value]
          return next
        })
        return result
      },
      rejectProposal: async (proposalId, reason) => {
        const ws = requireWs()
        const result = await api.rejectProposal(ws, proposalId, reason)
        patch(ws, (d) => ({ ...d, proposals: upsert(d.proposals, result.proposal), activity: [result.activity, ...d.activity] }))
        return result
      },
      updateCommitment: async (id, update) => {
        const ws = requireWs()
        const result = await api.updateCommitment(ws, id, update)
        patch(ws, (d) => ({
          ...d,
          commitments: upsert(d.commitments, result.commitment),
          activity: [...result.activity, ...d.activity],
        }))
        return result
      },
      ask: (question) => api.ask(requireWs(), question),
    }),
    [user, workspaces, activeWorkspaceId, status, error, data, load, patch, requireWs],
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppStore() {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used inside AppStoreProvider')
  return ctx
}
