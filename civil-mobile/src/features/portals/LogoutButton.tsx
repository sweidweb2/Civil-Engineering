import { useState } from 'react'
import { router } from 'expo-router'

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import { useAuthStore } from '@/stores/authStore'

export function LogoutButton() {
  const logout = useAuthStore((s) => s.logout)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  function onPress() {
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

  return (
    <Button
      size="sm"
      variant="outline"
      onPress={onPress}
      disabled={isLoggingOut}
      accessibilityState={{ busy: isLoggingOut }}
    >
      {isLoggingOut ? <ButtonSpinner /> : null}
      <ButtonText>{isLoggingOut ? 'Logging out…' : 'Log out'}</ButtonText>
    </Button>
  )
}
