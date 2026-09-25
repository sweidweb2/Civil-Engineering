import { create } from 'zustand'

import type { AuthRole } from '@/services/auth'

import type { AdminUserRow, UserStatus } from './admin.types'
import { MOCK_USERS } from './mock-data'

export type UserFormValues = {
  email: string
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

export function formFromUser(row: AdminUserRow): UserFormValues {
  return {
    email: row.email,
    role: row.role,
    status: row.status,
    firstName: row.profile.firstName ?? '',
    lastName: row.profile.lastName ?? '',
    displayName: row.profile.displayName ?? '',
    phone: row.profile.phone ?? '',
    avatarUrl: row.profile.avatarUrl ?? '',
  }
}

function buildRow(form: UserFormValues, current?: AdminUserRow): AdminUserRow {
  const now = new Date().toISOString()
  const email = form.email.trim().toLowerCase()
  return {
    id: current?.id ?? `usr_${Date.now()}`,
    email,
    role: form.role,
    status: form.status,
    isVerified: current?.isVerified ?? false,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    profile: {
      firstName: form.firstName.trim() || null,
      lastName: form.lastName.trim() || null,
      displayName: form.displayName.trim() || null,
      phone: form.phone.trim() || null,
      avatarUrl: form.avatarUrl.trim() || null,
      createdAt: current?.profile.createdAt ?? now,
      updatedAt: now,
    },
  }
}

type UsersState = {
  items: AdminUserRow[]
  createUser: (form: UserFormValues) => string | null
  updateUser: (id: string, form: UserFormValues) => string | null
  removeUser: (id: string) => void
  toggleStatus: (id: string) => void
}

/** Client mock users only — not an API cache. */
export const useUsersStore = create<UsersState>((set, get) => ({
  items: MOCK_USERS,
  createUser: (form) => {
    const email = form.email.trim().toLowerCase()
    if (!email) return 'Email is required'
    if (get().items.some((row) => row.email.toLowerCase() === email)) {
      return 'That email is already in this list'
    }
    set((state) => ({ items: [buildRow(form), ...state.items] }))
    return null
  },
  updateUser: (id, form) => {
    const email = form.email.trim().toLowerCase()
    if (!email) return 'Email is required'
    const current = get().items.find((row) => row.id === id)
    if (!current) return 'User not found'
    if (get().items.some((row) => row.id !== id && row.email.toLowerCase() === email)) {
      return 'That email is already in this list'
    }
    set((state) => ({
      items: state.items.map((row) => (row.id === id ? buildRow(form, current) : row)),
    }))
    return null
  },
  removeUser: (id) => set((state) => ({ items: state.items.filter((row) => row.id !== id) })),
  toggleStatus: (id) =>
    set((state) => ({
      items: state.items.map((row) =>
        row.id === id
          ? {
              ...row,
              status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
              updatedAt: new Date().toISOString(),
            }
          : row,
      ),
    })),
}))
