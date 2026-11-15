import { useState } from 'react'
import { router } from 'expo-router'

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import { useAuthStore } from '@/stores/authStore'

/** Confirm-then-logout flow shared by every "Log out" control. */
export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  function requestLogout() {
    if (isLoggingOut) return

    showBlockingAlert('Log out?', 'You will need to sign in again.', {
      cancelLabel: 'Cancel',
      confirmLabel: 'Log out',
      onConfirm: () => {
        void (async () => {
          setIsLoggingOut(true)
          try {
            await logout()
            router.replace('/login')
          } catch (error) {
            showApiAlert(error, 'Log out failed', 'Could not log out')
          } finally {
            setIsLoggingOut(false)
          }
        })()
      },
    })
  }

  return { isLoggingOut, requestLogout }
}

export function LogoutButton() {
  const { isLoggingOut, requestLogout } = useLogout()

  return (
    <Button
      size="sm"
      variant="outline"
      onPress={requestLogout}
      disabled={isLoggingOut}
      accessibilityState={{ busy: isLoggingOut }}
    >
      {isLoggingOut ? <ButtonSpinner /> : null}
      <ButtonText>{isLoggingOut ? 'Logging out…' : 'Log out'}</ButtonText>
    </Button>
  )
}
