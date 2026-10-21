import { beforeEach, describe, expect, it } from 'vitest'
import { formatIndianMobile, maskIndianMobile, normaliseIndianMobile } from './phone'
import { testAuth } from './testAuth'
import { AuthError } from './types'

describe('Indian mobile numbers', () => {
  it('accepts common ways of typing a number', () => {
    for (const input of ['9876543210', '98765 43210', '+91 98765-43210', '919876543210', '09876543210']) {
      expect(normaliseIndianMobile(input)).toEqual({ ok: true, e164: '+919876543210', national: '9876543210' })
    }
  })
  it('rejects empty, short and non-mobile numbers', () => {
    expect(normaliseIndianMobile('')).toEqual({ ok: false, error: 'empty' })
    expect(normaliseIndianMobile('98765')).toEqual({ ok: false, error: 'length' })
    expect(normaliseIndianMobile('4876543210')).toEqual({ ok: false, error: 'prefix' })
  })
  it('formats and masks for display', () => {
    expect(formatIndianMobile('+919876543210')).toBe('+91 98765 43210')
    expect(maskIndianMobile('+919876543210')).toBe('+91 98••• ••210')
  })
})

describe('test-mode sign-in', () => {
  beforeEach(() => localStorage.clear())

  it('signs in with the test code and keeps the session', async () => {
    const ch = await testAuth.sendOtp('+919876543210')
    const session = await testAuth.verifyOtp(ch.challengeId, testAuth.testCode!)
    expect(session.userId).toBe('u_919876543210')
    expect(testAuth.getSession()?.phone).toBe('+919876543210')
    await testAuth.signOut()
    expect(testAuth.getSession()).toBeNull()
  })

  it('counts wrong codes and locks after five', async () => {
    const ch = await testAuth.sendOtp('+918765432109')
    let last: AuthError | undefined
    for (let i = 0; i < 5; i++) {
      try {
        await testAuth.verifyOtp(ch.challengeId, '000000')
      } catch (e) {
        last = e as AuthError
      }
    }
    expect(last?.code).toBe('too_many_attempts')
    await expect(testAuth.verifyOtp(ch.challengeId, testAuth.testCode!)).rejects.toMatchObject({ code: 'too_many_attempts' })
  }, 10000)

  it('limits how often a code can be re-sent', async () => {
    await testAuth.sendOtp('+917654321098')
    await expect(testAuth.sendOtp('+917654321098')).rejects.toMatchObject({ code: 'too_many_requests' })
  })
})
