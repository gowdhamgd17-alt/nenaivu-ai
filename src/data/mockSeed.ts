/**
 * MOCK SEED DATA — fictional businesses, people and events for the prototype.
 * Dates are generated relative to "today" so overdue / due-today / upcoming
 * states always render. Nothing here comes from a real system.
 */
import { addDays, timestampDaysAgo, todayISO } from '@/lib/dates'
import type {
  ActivityEvent,
  Capture,
  Commitment,
  Memory,
  Person,
  Proposal,
  User,
  Workspace,
} from '@/types/models'

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

export const CURRENT_USER: User = {
  id: 'u_anitha',
  name: 'Anitha Kumar',
  email: 'anitha@example.com',
  initials: 'AK',
}

export function buildMockSeed(): DataSnapshot {
  const today = todayISO()
  const me = CURRENT_USER.id
  const W1 = 'ws_meenakshi'
  const W2 = 'ws_kaveri'

  const workspaces: Workspace[] = [
    { id: W1, name: 'Meenakshi Textiles', industry: 'Fabric wholesale · Coimbatore' },
    { id: W2, name: 'Kaveri Design Studio', industry: 'Branding studio · Bengaluru' },
  ]

  // ── People & organisations ────────────────────────────────────────────────
  const people: Person[] = [
    { id: 'p_lotus', workspaceId: W1, kind: 'organisation', name: 'Lotus Apparel', role: 'Customer · garment manufacturer', createdAt: timestampDaysAgo(60) },
    { id: 'p_priya', workspaceId: W1, kind: 'person', name: 'Priya Raman', role: 'Procurement lead', organisationId: 'p_lotus', createdAt: timestampDaysAgo(60), sourceCaptureId: 'c_w1_call' },
    { id: 'p_northwind', workspaceId: W1, kind: 'organisation', name: 'Northwind Logistics', role: 'Freight partner', createdAt: timestampDaysAgo(90) },
    { id: 'p_arjun', workspaceId: W1, kind: 'person', name: 'Arjun Mehta', role: 'Accounts', organisationId: 'p_northwind', createdAt: timestampDaysAgo(90) },
    { id: 'p_kavitha', workspaceId: W1, kind: 'person', name: 'Kavitha Selvam', role: 'Freelance textile designer', createdAt: timestampDaysAgo(40) },
    { id: 'p_brewhaus', workspaceId: W2, kind: 'organisation', name: 'Brewhaus Coffee', role: 'Client · café chain', createdAt: timestampDaysAgo(30) },
    { id: 'p_anand', workspaceId: W2, kind: 'person', name: 'Anand Rao', role: 'Founder', organisationId: 'p_brewhaus', createdAt: timestampDaysAgo(30) },
    { id: 'p_lena', workspaceId: W2, kind: 'person', name: 'Lena Fernandes', role: 'Print vendor', createdAt: timestampDaysAgo(20) },
  ]

  // ── Original captures (immutable source material) ─────────────────────────
  const captures: Capture[] = [
    {
      id: 'c_w1_call', workspaceId: W1, kind: 'text', channel: 'quick_capture', createdBy: me, createdAt: timestampDaysAgo(6, 3),
      content:
        'Call with Priya Raman (Lotus Apparel). They want 1,200 m of navy cotton twill for their spring line. ' +
        'I promised to send swatch samples within four days. They prefer 2 m swatches, not small cuttings. ' +
        'Pricing depends on the mill quote — I said we would share it once the mill responds.',
    },
    {
      id: 'c_w1_freight', workspaceId: W1, kind: 'text', channel: 'quick_capture', createdBy: me, createdAt: timestampDaysAgo(3, 5),
      content:
        'Arjun from Northwind Logistics confirmed the September freight invoice double-counted one shipment. ' +
        'He will send a corrected invoice. Agreed date for the corrected invoice is ' + addDays(today, 4) + '. Do not pay the original.',
    },
    {
      id: 'c_w1_sundar', workspaceId: W1, kind: 'text', channel: 'quick_capture', createdBy: me, createdAt: timestampDaysAgo(1, 2),
      content:
        'Email from Rahul Nair at Sundar Export House: asking whether we can do a trial order of 300 m washed linen. ' +
        'We need to reply with MOQ and lead time by end of the month.',
    },
    {
      id: 'c_w1_kavitha', workspaceId: W1, kind: 'text', channel: 'quick_capture', createdBy: me, createdAt: timestampDaysAgo(0, 2),
      content:
        'Met Kavitha this morning. She will finish the festive collection mood board by Friday. ' +
        'Priya from Lotus Apparel also asked again about the navy twill samples — need to send navy twill samples to Lotus Apparel.',
    },
    {
      // A note written in Tamil — kept exactly as written, never translated.
      id: 'c_w1_tamil', workspaceId: W1, kind: 'text', channel: 'quick_capture', createdBy: me, createdAt: timestampDaysAgo(9, 1),
      content:
        'கவிதாவுடன் பேசினேன். பொங்கல் தொகுப்புக்கு மஞ்சள், பச்சை நிறங்களில் மட்டும் வடிவமைப்புகள் வேண்டும் என்றார். ' +
        'சிவப்பு நிறம் இந்த முறை வேண்டாம்.',
    },
    {
      id: 'c_w2_brew', workspaceId: W2, kind: 'text', channel: 'quick_capture', createdBy: me, createdAt: timestampDaysAgo(2, 4),
      content:
        'Brewhaus kickoff with Anand. They want the logo refresh to keep the existing teal. ' +
        'We will present three logo directions on ' + addDays(today, 2) + '. Anand will send the old brand files soon.',
    },
  ]

  // ── Confirmed records ─────────────────────────────────────────────────────
  const commitments: Commitment[] = [
    {
      id: 'k_samples', workspaceId: W1, title: 'Send navy twill swatch samples to Lotus Apparel',
      description: '2 m swatches of navy cotton twill for the spring line enquiry (1,200 m).',
      direction: 'we_owe', personId: 'p_priya', dueDate: addDays(today, -2), status: 'open',
      sourceCaptureId: 'c_w1_call', confirmedAt: timestampDaysAgo(6, 2), confirmedBy: me,
    },
    {
      id: 'k_dye', workspaceId: W1, title: 'Confirm dyeing slot with the mill',
      description: 'Needed before we can quote a delivery window to Lotus Apparel.',
      direction: 'we_owe', dueDate: today, status: 'open', confirmedAt: timestampDaysAgo(4), confirmedBy: me,
    },
    {
      id: 'k_quote', workspaceId: W1, title: 'Share mill price quote with Lotus Apparel',
      description: 'Send once the mill responds. Pricing was not committed on the call.',
      direction: 'we_owe', personId: 'p_priya', status: 'open',
      sourceCaptureId: 'c_w1_call', confirmedAt: timestampDaysAgo(6, 2), confirmedBy: me,
    },
    {
      id: 'k_invoice', workspaceId: W1, title: 'Corrected September freight invoice from Northwind',
      description: 'Original invoice double-counted one shipment. Do not pay the original.',
      direction: 'owed_to_us', personId: 'p_arjun', dueDate: addDays(today, 4), status: 'open',
      sourceCaptureId: 'c_w1_freight', confirmedAt: timestampDaysAgo(3, 4), confirmedBy: me,
    },
    {
      id: 'k_gst', workspaceId: W1, title: 'Send quarterly purchase records to the accountant',
      description: '', direction: 'we_owe', dueDate: addDays(today, 9), status: 'open',
      confirmedAt: timestampDaysAgo(10), confirmedBy: me,
    },
    {
      id: 'k_poplin', workspaceId: W1, title: 'Deliver 800 m indigo poplin to Lotus Apparel',
      description: '', direction: 'we_owe', personId: 'p_priya', dueDate: addDays(today, -5), status: 'done',
      confirmedAt: timestampDaysAgo(20), confirmedBy: me, completedAt: timestampDaysAgo(5),
    },
    {
      id: 'k_present', workspaceId: W2, title: 'Present three logo directions to Brewhaus',
      description: 'Keep the existing teal.', direction: 'we_owe', personId: 'p_anand', dueDate: addDays(today, 2), status: 'open',
      sourceCaptureId: 'c_w2_brew', confirmedAt: timestampDaysAgo(2, 3), confirmedBy: me,
    },
    {
      id: 'k_proofs', workspaceId: W2, title: 'Approve business card print proofs',
      description: '', direction: 'we_owe', personId: 'p_lena', dueDate: addDays(today, -1), status: 'open',
      confirmedAt: timestampDaysAgo(7), confirmedBy: me,
    },
  ]

  const memories: Memory[] = [
    {
      id: 'm_lotus_pref', workspaceId: W1, title: 'Lotus Apparel prefers 2 m swatches',
      summary: 'Priya asked for 2 m swatches rather than small cuttings when evaluating fabric for the spring line.',
      personIds: ['p_priya', 'p_lotus'], sourceCaptureId: 'c_w1_call', confirmedAt: timestampDaysAgo(6, 2), confirmedBy: me,
    },
    {
      id: 'm_lotus_pricing', workspaceId: W1, title: 'Twill pricing for Lotus not yet committed',
      summary: 'Pricing for the 1,200 m navy twill enquiry depends on the mill quote. No price was given on the call.',
      personIds: ['p_lotus'], sourceCaptureId: 'c_w1_call', confirmedAt: timestampDaysAgo(6, 2), confirmedBy: me,
    },
    {
      id: 'm_freight', workspaceId: W1, title: 'Do not pay the original September freight invoice',
      summary: 'Northwind confirmed the September invoice double-counted one shipment. A corrected invoice is coming from Arjun Mehta.',
      personIds: ['p_arjun', 'p_northwind'], sourceCaptureId: 'c_w1_freight', confirmedAt: timestampDaysAgo(3, 4), confirmedBy: me,
    },
    {
      id: 'm_mill', workspaceId: W1, title: 'Mill quotes usually take three working days',
      summary: 'Recorded before source tracking was available in this workspace.',
      personIds: [], confirmedAt: timestampDaysAgo(25), confirmedBy: me,
    },
    {
      id: 'm_pongal', workspaceId: W1, title: 'பொங்கல் தொகுப்புக்கு மஞ்சள், பச்சை நிறங்கள் மட்டும்',
      summary: 'கவிதா: பொங்கல் தொகுப்பின் வடிவமைப்புகள் மஞ்சள், பச்சை நிறங்களில் மட்டும். இந்த முறை சிவப்பு வேண்டாம்.',
      personIds: ['p_kavitha'], sourceCaptureId: 'c_w1_tamil', confirmedAt: timestampDaysAgo(9), confirmedBy: me,
    },
    {
      id: 'm_teal', workspaceId: W2, title: 'Brewhaus wants to keep its existing teal',
      summary: 'The logo refresh should retain the current brand teal, per Anand at kickoff.',
      personIds: ['p_anand', 'p_brewhaus'], sourceCaptureId: 'c_w2_brew', confirmedAt: timestampDaysAgo(2, 3), confirmedBy: me,
    },
  ]

  // ── Pending proposals (simulated extraction output) ──────────────────────
  const blank = { summary: '', direction: 'we_owe' as const, partyKind: 'person' as const }
  const proposals: Proposal[] = [
    {
      id: 'pr_kavitha_board', workspaceId: W1, captureId: 'c_w1_kavitha', recordType: 'commitment', status: 'pending',
      createdAt: timestampDaysAgo(0, 2),
      sourceExcerpt: 'She will finish the festive collection mood board by Friday.',
      fields: {
        ...blank, title: 'Kavitha to finish festive collection mood board', direction: 'owed_to_us', personId: 'p_kavitha',
        deadline: { kind: 'ambiguous', phrase: 'by Friday', reason: { code: 'weekday', weekday: 4 } },
      },
      uncertainties: [{ code: 'name_only_match', params: { short: 'Kavitha', name: 'Kavitha Selvam' } }],
    },
    {
      id: 'pr_samples_dupe', workspaceId: W1, captureId: 'c_w1_kavitha', recordType: 'commitment', status: 'pending',
      createdAt: timestampDaysAgo(0, 2),
      sourceExcerpt: 'need to send navy twill samples to Lotus Apparel.',
      fields: { ...blank, title: 'Send navy twill samples to Lotus Apparel', personId: 'p_lotus', partyKind: 'organisation', deadline: { kind: 'none' } },
      uncertainties: [{ code: 'no_deadline' }],
      possibleDuplicateOf: { recordType: 'commitment', id: 'k_samples' },
    },
    {
      id: 'pr_rahul_reply', workspaceId: W1, captureId: 'c_w1_sundar', recordType: 'commitment', status: 'pending',
      createdAt: timestampDaysAgo(1, 2),
      sourceExcerpt: 'We need to reply with MOQ and lead time by end of the month.',
      fields: {
        ...blank, title: 'Reply to Rahul Nair with MOQ and lead time', personName: 'Rahul Nair',
        deadline: { kind: 'ambiguous', phrase: 'by end of the month', reason: { code: 'month_end' } },
      },
      uncertainties: [{ code: 'not_confirmed_contact', params: { name: 'Rahul Nair' } }],
    },
    {
      id: 'pr_rahul_person', workspaceId: W1, captureId: 'c_w1_sundar', recordType: 'person', status: 'pending',
      createdAt: timestampDaysAgo(1, 2),
      sourceExcerpt: 'Email from Rahul Nair at Sundar Export House',
      fields: { ...blank, title: 'Rahul Nair', summary: 'Contact at Sundar Export House.', deadline: { kind: 'none' } },
      uncertainties: [{ code: 'role_unknown', params: { org: 'Sundar Export House' } }],
    },
    {
      id: 'pr_sundar_org', workspaceId: W1, captureId: 'c_w1_sundar', recordType: 'person', status: 'pending',
      createdAt: timestampDaysAgo(1, 2),
      sourceExcerpt: 'Rahul Nair at Sundar Export House',
      fields: { ...blank, title: 'Sundar Export House', partyKind: 'organisation', summary: 'Prospective customer.', deadline: { kind: 'none' } },
      uncertainties: [],
    },
    {
      id: 'pr_sundar_memory', workspaceId: W1, captureId: 'c_w1_sundar', recordType: 'memory', status: 'pending',
      createdAt: timestampDaysAgo(1, 2),
      sourceExcerpt: 'asking whether we can do a trial order of 300 m washed linen.',
      fields: { ...blank, title: 'Sundar Export House enquired about a 300 m linen trial order', summary: 'Rahul Nair asked whether a 300 m trial order of washed linen is possible.', personName: 'Rahul Nair', deadline: { kind: 'none' } },
      uncertainties: [],
    },
    {
      id: 'pr_brew_files', workspaceId: W2, captureId: 'c_w2_brew', recordType: 'commitment', status: 'pending',
      createdAt: timestampDaysAgo(2, 3),
      sourceExcerpt: 'Anand will send the old brand files soon.',
      fields: {
        ...blank, title: 'Anand to send old Brewhaus brand files', direction: 'owed_to_us', personId: 'p_anand',
        deadline: { kind: 'ambiguous', phrase: 'soon', reason: { code: 'not_a_date' } },
      },
      uncertainties: [],
    },
  ]

  const activity: ActivityEvent[] = [
    { id: 'a1', workspaceId: W1, type: 'commitment_status_changed', at: timestampDaysAgo(5), actorId: me, params: { title: 'Deliver 800 m indigo poplin to Lotus Apparel', from: 'open', to: 'done' }, refs: ['k_poplin'] },
    { id: 'a2', workspaceId: W1, type: 'proposal_approved', at: timestampDaysAgo(3, 4), actorId: me, params: { recordType: 'commitment', title: 'Corrected September freight invoice from Northwind' }, refs: ['k_invoice', 'c_w1_freight'] },
    { id: 'a3', workspaceId: W1, type: 'capture_created', at: timestampDaysAgo(1, 2), actorId: me, params: { captureKind: 'text', proposalCount: 4 }, refs: ['c_w1_sundar'] },
    { id: 'a4', workspaceId: W1, type: 'capture_created', at: timestampDaysAgo(0, 2), actorId: me, params: { captureKind: 'text', proposalCount: 2 }, refs: ['c_w1_kavitha'] },
    { id: 'a5', workspaceId: W2, type: 'proposal_approved', at: timestampDaysAgo(2, 3), actorId: me, params: { recordType: 'commitment', title: 'Present three logo directions to Brewhaus' }, refs: ['k_present', 'c_w2_brew'] },
  ]

  return { workspaces, users: [CURRENT_USER], people, captures, proposals, memories, commitments, activity }
}
