/**
 * Tiny wrapper around localStorage for browser-level preferences.
 * Storage can be unavailable (private windows, blocked site data, sandboxed
 * frames), so every access is guarded and falls back to the default.
 */
export function readPref<T extends string>(key: string, isValid: (v: unknown) => v is T, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return isValid(value) ? value : fallback
  } catch {
    return fallback
  }
}

export function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Preference simply won't persist; the in-memory value still applies.
  }
}
