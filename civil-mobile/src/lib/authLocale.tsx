import { createContext, useContext } from 'react'

/** True inside login/register/pending — copy + inputs stay English + LTR. */
export const AuthLocaleContext = createContext(false)

export function useIsAuthLocale(): boolean {
  return useContext(AuthLocaleContext)
}
