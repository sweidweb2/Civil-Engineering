export type UserStatus = 'active' | 'inactive'

export type User = {
  id: string
  email: string
  name: string
  roles: string[]
  status: UserStatus
  createdAt: string
  updatedAt: string
}
