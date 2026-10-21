/**
 * Sign-in contract. The UI talks only to `AuthProvider`; today it is backed by
 * a test-mode provider that sends no SMS. A real provider (Firebase phone auth,
 * MSG91, Twilio Verify…) can implement the same interface later.
 */
export interface AuthSession {
  userId: string
  /** Verified mobile number in E.164 form. */
  phone: string
  signedInAt: string
}

export interface OtpChallenge {
  challengeId: string
  phone: string
  /** Seconds until "Resend code" becomes available. */
  resendAfter: number
  codeLength: number
}

export type AuthErrorCode =
  | 'invalid_phone'
  | 'wrong_code'
  | 'code_expired'
  | 'too_many_attempts'
  | 'too_many_requests'
  | 'unknown'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  readonly attemptsLeft?: number
  constructor(code: AuthErrorCode, attemptsLeft?: number) {
    super(code)
    this.name = 'AuthError'
    this.code = code
    this.attemptsLeft = attemptsLeft
  }
}

export interface AuthProvider {
  readonly id: string
  /** True when no real SMS is sent. The UI must say so plainly. */
  readonly testMode: boolean
  /** The code that works in test mode; undefined for real providers. */
  readonly testCode?: string
  getSession: () => AuthSession | null
  sendOtp: (phoneE164: string) => Promise<OtpChallenge>
  verifyOtp: (challengeId: string, code: string) => Promise<AuthSession>
  signOut: () => Promise<void>
}
