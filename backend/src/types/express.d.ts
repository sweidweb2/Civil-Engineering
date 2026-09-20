export type AuthUser = {
  id: string
  roles: string[]
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string
      user?: AuthUser
    }
  }
}

export {}
