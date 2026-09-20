export type UserStatus = 'ACTIVE' | 'INACTIVE'

export type UserRole = 'SUPER' | 'ADMIN' | 'PROVIDER' | 'WORKER' | 'MANAGER' | 'CLIENT'

export type UserProfile = {
  firstName: string | null
  lastName: string | null
  displayName: string | null
  phone: string | null
  avatarUrl: string | null
}

export type User = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  profile: UserProfile | null
  createdAt: string
  updatedAt: string
}
