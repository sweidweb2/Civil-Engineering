/** Web token storage — localStorage (SecureStore is native-only). */
export const authStorage = {
  getItem: async (name: string) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(name)
  },
  setItem: async (name: string, value: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(name, value)
  },
  removeItem: async (name: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(name)
  },
}
