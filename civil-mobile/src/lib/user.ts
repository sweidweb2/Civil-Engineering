type NamedUser = {
  email: string
  profile?: {
    firstName?: string | null
    lastName?: string | null
    displayName?: string | null
  } | null
}

/** Best available human name for a user, falling back to the email. */
export function userDisplayName(user: NamedUser): string {
  return (
    user.profile?.displayName ||
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
    user.email
  )
}

/** Short name for greetings. */
export function userFirstName(user: NamedUser): string {
  return (
    user.profile?.firstName ||
    user.profile?.displayName?.split(' ')[0] ||
    user.email.split('@')[0] ||
    'there'
  )
}

const ROLE_LABELS: Record<string, string> = {
  SUPER: 'Super admin',
  ADMIN: 'Administrator',
  MANAGER: 'Project manager',
  PROVIDER: 'Provider',
  WORKER: 'Worker',
  CLIENT: 'Client',
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

/** Up to two initials ("Najd Equipment & Supply" → "NS"). Skips symbols like "&". */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => /^[\p{L}\p{N}]/u.test(part))
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}
