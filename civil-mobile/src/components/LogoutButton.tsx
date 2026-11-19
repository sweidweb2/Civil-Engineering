import { useState } from 'react'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import { useAuthStore } from '@/stores/authStore'

/** Confirm-then-logout flow shared by every "Log out" control. */
export function useLogout() {
  const { t } = useTranslation()
  const logout = useAuthStore((s) => s.logout)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  /** Log out without asking (for screens that show their own confirm dialog). */
  async function logoutNow() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
      router.replace('/login')
    } catch (error) {
      showApiAlert(error, t('account.logoutFailed'))
    } finally {
      setIsLoggingOut(false)
    }
  }

  function requestLogout() {
    if (isLoggingOut) return

    showBlockingAlert(t('account.logoutTitle'), t('account.logoutBody'), {
      destructive: true,
      cancelLabel: t('common.cancel'),
      confirmLabel: t('account.logout'),
      onConfirm: () => void logoutNow(),
    })
  }

  return { isLoggingOut, requestLogout, logoutNow }
}

export function LogoutButton() {
  const { t } = useTranslation()
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
      <ButtonText>{isLoggingOut ? t('account.loggingOut') : t('account.logout')}</ButtonText>
    </Button>
  )
}

/** "Log out": a text button in `negative`, typically last on the screen. */
export function LogoutRow() {
  const { t } = useTranslation()
  const { isLoggingOut, requestLogout } = useLogout()
  return (
    <Button
      variant="ghost"
      className="self-start px-0"
      onPress={requestLogout}
      disabled={isLoggingOut}
      accessibilityState={{ busy: isLoggingOut }}
    >
      {isLoggingOut ? <ButtonSpinner /> : null}
      <ButtonText className="text-destructive">
        {isLoggingOut ? t('account.loggingOut') : t('account.logout')}
      </ButtonText>
    </Button>
  )
}
