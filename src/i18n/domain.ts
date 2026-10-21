/**
 * Renders coded domain values (from the service layer) as interface text.
 * Business content inside params (titles, names, quoted phrases, reasons) is
 * inserted verbatim — only the surrounding wording is translated.
 */
import { errorCode } from '@/services/api'
import type { ActivityEvent, Capture, DeadlineReason, Uncertainty } from '@/types/models'
import type { Formatter, TKey, Translate } from './translate'

export function uncertaintyText(u: Uncertainty, t: Translate) {
  return t(`unc.${u.code}` as TKey, u.params)
}

export function deadlineReasonText(r: DeadlineReason, t: Translate, fmt: Formatter) {
  if (r.code === 'weekday') return t('dl.weekday', { day: fmt.weekday(r.weekday) })
  return t(`dl.${r.code}` as TKey)
}

export function serviceErrorText(e: unknown, t: Translate) {
  return t(`error.${errorCode(e)}` as TKey)
}

export function captureSourceLabel(capture: Capture | undefined, t: Translate) {
  if (!capture) return t('proposal.aCapture')
  return capture.fileName ?? t(`channel.${capture.channel}` as TKey)
}

export function activityText(e: ActivityEvent, t: Translate, fmt: Formatter) {
  const p = e.params
  const title = p.title ?? ''
  const recordType = p.recordType ? t(`recordLower.${p.recordType}` as TKey) : ''
  switch (e.type) {
    case 'capture_created': {
      const proposals = t('count.proposals', { count: p.proposalCount ?? 0 })
      return p.captureKind === 'file' ? t('activity.captureFile', { fileName: p.fileName ?? '', proposals }) : t('activity.captureNote', { proposals })
    }
    case 'proposal_approved':
      return p.editedFields?.length
        ? t('activity.approvedEdits', { recordType, title, fields: fmt.list(p.editedFields.map((f) => t(`field.${f}` as TKey))) })
        : t('activity.approved', { recordType, title })
    case 'proposal_rejected':
      return p.reason ? t('activity.rejectedReason', { recordType, title, reason: p.reason }) : t('activity.rejected', { recordType, title })
    case 'commitment_status_changed':
      return t('activity.status', {
        title,
        from: t(`statusLower.${p.from ?? 'open'}` as TKey),
        to: t(`statusLower.${p.to ?? 'open'}` as TKey),
      })
    case 'commitment_due_date_changed':
      return p.date ? t('activity.dueSet', { title, date: fmt.date(p.date) }) : t('activity.dueRemoved', { title })
  }
}
