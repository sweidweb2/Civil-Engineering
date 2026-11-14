const STORAGE_KEY = 'civil-web:admin-users-layout'

export type UsersPageLayout = {
  showUsage: boolean
}

const DEFAULT_LAYOUT: UsersPageLayout = {
  showUsage: true,
}

export function readUsersPageLayout(): UsersPageLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_LAYOUT
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_LAYOUT
    const showUsage = (parsed as { showUsage?: unknown }).showUsage
    return { showUsage: typeof showUsage === 'boolean' ? showUsage : true }
  } catch {
    return DEFAULT_LAYOUT
  }
}

export function writeUsersPageLayout(layout: UsersPageLayout): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
}
