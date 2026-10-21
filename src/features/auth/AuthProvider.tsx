import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { initials } from '@/lib/utils'
import { auth, type AuthSession } from '@/services/auth'
import { openUserData } from '@/services/mock/mockApi'
import type { User } from '@/types/models'

export interface Profile {
  name: string
  business: string
}

type AuthStatus = 'signedOut' | 'needsProfile' | 'signedIn'

interface AuthValue {
  status: AuthStatus
  session: AuthSession | null
  profile: Profile | null
  /** Called by the OTP screen after a successful verification. */
  completeSignIn: (session: AuthSession) => void
  saveProfile: (profile: Profile) => void
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

const profileKey = (userId: string) => `nenaivu.profile.${userId}`

function readProfile(userId: string): Profile | null {
  try {
    const raw = localStorage.getItem(profileKey(userId))
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<Profile>
    return typeof p.name === 'string' && p.name.trim() ? { name: p.name, business: p.business ?? '' } : null
  } catch {
    return null
  }
}

function writeProfile(userId: string, profile: Profile) {
  try {
    localStorage.setItem(profileKey(userId), JSON.stringify(profile))
  } catch {
    // Profile lasts for this tab only if storage is blocked.
  }
}

/** Points the data service at this user's own records. */
function openData(session: AuthSession, profile: Profile) {
  const user: User = { id: session.userId, name: profile.name, email: '', initials: initials(profile.name), phone: session.phone }
  openUserData(user, profile.business)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => auth.getSession())
  const [profile, setProfile] = useState<Profile | null>(() => {
    const s = auth.getSession()
    const p = s ? readProfile(s.userId) : null
    if (s && p) openData(s, p)
    return p
  })

  const completeSignIn = useCallback((s: AuthSession) => {
    const p = readProfile(s.userId)
    if (p) openData(s, p)
    setSession(s)
    setProfile(p)
  }, [])

  const saveProfile = useCallback(
    (p: Profile) => {
      if (!session) return
      const clean = { name: p.name.trim(), business: p.business.trim() }
      writeProfile(session.userId, clean)
      openData(session, clean)
      setProfile(clean)
    },
    [session],
  )

  const signOut = useCallback(async () => {
    await auth.signOut()
    // The next person to sign in starts on Overview, never on the previous person's page.
    if (typeof window !== 'undefined') window.location.hash = '#/'
    setSession(null)
    setProfile(null)
  }, [])

  const status: AuthStatus = !session ? 'signedOut' : !profile ? 'needsProfile' : 'signedIn'

  const value = useMemo(
    () => ({ status, session, profile, completeSignIn, saveProfile, signOut }),
    [status, session, profile, completeSignIn, saveProfile, signOut],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
