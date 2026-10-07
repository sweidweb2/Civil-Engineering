import type { AuthRole } from '@/services/auth'
import type { User } from '@/services/users'

import type { AdminUserRow, UserStatus } from './admin.types'

export type UserFormValues = {
  email: string
  password: string
  role: AuthRole
  status: UserStatus
  firstName: string
  lastName: string
  displayName: string
  phone: string
  avatarUrl: string
}

export const EMPTY_USER_FORM: UserFormValues = {
  email: '',
  password: '',
  role: 'CLIENT',
  status: 'ACTIVE',
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
  avatarUrl: '',
}

export const USER_ROLES: AuthRole[] = ['SUPER', 'ADMIN', 'PROVIDER', 'WORKER', 'MANAGER', 'CLIENT']

export function isUserRole(value: string): value is AuthRole {
  return (USER_ROLES as readonly string[]).includes(value)
}

export function toAdminUserRow(user: User): AdminUserRow {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: {
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      displayName: user.profile?.displayName ?? null,
      phone: user.profile?.phone ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  }
}

export function formFromUser(row: AdminUserRow): UserFormValues {
  return {
    email: row.email,
    password: '',
    role: row.role,
    status: row.status,
    firstName: row.profile.firstName ?? '',
    lastName: row.profile.lastName ?? '',
    displayName: row.profile.displayName ?? '',
    phone: row.profile.phone ?? '',
    avatarUrl: row.profile.avatarUrl ?? '',
  }
}
