/**
 * Unit tests mount hooks outside a navigation container. Stub `useFocusEffect`
 * so invalidate → refetch matches an on-screen host by default.
 *
 * Variable names use the `mock` prefix so Jest's mock factory can close over them.
 */
type FocusCallback = () => void | (() => void)

const mockFocusState = {
  callback: null as FocusCallback | null,
  cleanup: null as (() => void) | null,
  focused: true,
}

function mockRunFocus() {
  const cleanup = mockFocusState.callback?.()
  mockFocusState.cleanup = typeof cleanup === 'function' ? cleanup : null
}

function mockRunBlur() {
  mockFocusState.cleanup?.()
  mockFocusState.cleanup = null
}

export function __setRemoteDataTestFocused(next: boolean) {
  if (mockFocusState.focused === next) return
  mockFocusState.focused = next
  if (next) mockRunFocus()
  else mockRunBlur()
}

export function __resetRemoteDataTestFocus() {
  mockFocusState.focused = true
  mockFocusState.callback = null
  mockFocusState.cleanup = null
}

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react')
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
    },
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect: FocusCallback) => {
      React.useEffect(() => {
        mockFocusState.callback = effect
        if (mockFocusState.focused) mockRunFocus()
        return () => {
          mockRunBlur()
          if (mockFocusState.callback === effect) mockFocusState.callback = null
        }
      }, [effect])
    },
  }
})
