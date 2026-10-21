/**
 * TEST-MODE SIGN-IN — no SMS is sent and nothing is verified with a server.
 * The code is always TEST_CODE. This exists so the login screens can be used and
 * tested before a real SMS provider is connected. It is NOT secure: anyone who
 * knows a number can sign in as it on this device.
 */
import { sleep } from '@/lib/utils'
import { AuthError, type AuthProvider, type AuthSession, type OtpChallenge } from './types'

const SESSION_KEY = 'nenaivu.session'
const TEST_CODE = '123456'
const CODE_TTL_MS = 5 * 60_000
const MAX_ATTEMPTS = 5
const RESEND_SECONDS = 30

interface Challenge {
  phone: string
  expiresAt: number
  attempts: number
}
const challenges = new Map<string, Challenge>()
const lastSent = new Map<string, number>()

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<AuthSession>
    return s.userId && s.phone && s.signedInAt ? (s as AuthSession) : null
  } catch {
    return null
  }
}

export const testAuth: AuthProvider = {
  id: 'test-mode',
  testMode: true,
  testCode: TEST_CODE,

  getSession: readSession,

  async sendOtp(phone): Promise<OtpChallenge> {
    await sleep(700)
    if (!/^\+91[6-9]\d{9}$/.test(phone)) throw new AuthError('invalid_phone')
    const last = lastSent.get(phone)
    if (last && Date.now() - last < RESEND_SECONDS * 1000) throw new AuthError('too_many_requests')
    lastSent.set(phone, Date.now())
    const challengeId = `ch_${Date.now().toString(36)}`
    challenges.set(challengeId, { phone, expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 })
    return { challengeId, phone, resendAfter: RESEND_SECONDS, codeLength: TEST_CODE.length }
  },

  async verifyOtp(challengeId, code): Promise<AuthSession> {
    await sleep(600)
    const ch = challenges.get(challengeId)
    if (!ch || Date.now() > ch.expiresAt) throw new AuthError('code_expired')
    if (ch.attempts >= MAX_ATTEMPTS) throw new AuthError('too_many_attempts')
    if (code !== TEST_CODE) {
      ch.attempts++
      const left = MAX_ATTEMPTS - ch.attempts
      throw new AuthError(left > 0 ? 'wrong_code' : 'too_many_attempts', left)
    }
    challenges.delete(challengeId)
    const session: AuthSession = { userId: `u_${ch.phone.replace(/\D/g, '')}`, phone: ch.phone, signedInAt: new Date().toISOString() }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch {
      // Session only lasts for this tab if storage is blocked.
    }
    return session
  },

  async signOut() {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      // ignore
    }
  },
}
