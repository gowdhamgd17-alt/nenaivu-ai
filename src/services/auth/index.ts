import { testAuth } from './testAuth'
import type { AuthProvider } from './types'

/** Swap for a real SMS-backed provider when one is connected. */
export const auth: AuthProvider = testAuth

export * from './phone'
export * from './types'
