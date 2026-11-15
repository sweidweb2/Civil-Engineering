const STORAGE_KEY = 'civil-device-id'

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

/** Stable browser device fingerprint used for register abuse limits. */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing && existing.length >= 8) return existing
    const id = createId()
    localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    return createId()
  }
}
