export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type LoginResult = {
  userId: string
  tokens: AuthTokens
}
