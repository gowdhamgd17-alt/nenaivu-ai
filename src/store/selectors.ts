import { dueBucket, todayISO } from '@/lib/dates'
import type { WorkspaceData } from '@/services'
import type { Commitment, DueBucket, ID, Person } from '@/types/models'

export function openCommitments(data: WorkspaceData) {
  return data.commitments.filter((c) => c.status === 'open')
}

export function commitmentsByBucket(data: WorkspaceData, bucket: DueBucket, today = todayISO()) {
  return openCommitments(data)
    .filter((c) => dueBucket(c, today) === bucket)
    .sort(byDueDate)
}

export function byDueDate(a: Commitment, b: Commitment) {
  if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title)
  if (!a.dueDate) return 1
  if (!b.dueDate) return -1
  return a.dueDate.localeCompare(b.dueDate)
}

export function pendingProposals(data: WorkspaceData) {
  return data.proposals.filter((p) => p.status === 'pending').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function findPerson(data: WorkspaceData, id?: ID): Person | undefined {
  return id ? data.people.find((p) => p.id === id) : undefined
}

/** "Priya Raman · Lotus Apparel" */
export function personLabel(data: WorkspaceData, id?: ID) {
  const p = findPerson(data, id)
  if (!p) return undefined
  const org = findPerson(data, p.organisationId)
  return org ? `${p.name} · ${org.name}` : p.name
}

export function findCapture(data: WorkspaceData, id?: ID) {
  return id ? data.captures.find((c) => c.id === id) : undefined
}

export function activityFor(data: WorkspaceData, id: ID) {
  return data.activity.filter((a) => a.refs.includes(id))
}

export function recentMemories(data: WorkspaceData, limit = 4) {
  return [...data.memories].sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt)).slice(0, limit)
}
