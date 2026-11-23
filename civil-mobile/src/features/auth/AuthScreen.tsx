import { useState } from 'react'
import { Redirect } from 'expo-router'
import Animated, { Easing, FadeInLeft, FadeInRight } from 'react-native-reanimated'

import { AuthLocaleGate } from '@/features/auth/AuthLocaleGate'
import { AuthShell } from '@/features/auth/AuthShell'
import { useAuthTranslation } from '@/features/auth/useAuthTranslation'
import { homePathForRole } from '@/navigation'
import { useAuthStore } from '@/stores/authStore'

import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { AuthSegmented } from './ui'

export type AuthMode = 'login' | 'register'

/**
 * Sign in and Create account live on one screen: the segmented switch swaps
 * the form in place (the hero title re-animates) instead of pushing a route.
 * `/login` and `/register` both render this with their starting mode.
 */
export function AuthScreen({ initialMode }: { initialMode: AuthMode }) {
  const { t } = useAuthTranslation()
  const user = useAuthStore((s) => s.user)
  const [mode, setMode] = useState<AuthMode>(initialMode)

  if (user) {
    return <Redirect href={homePathForRole(user.role) as never} />
  }

  const isLogin = mode === 'login'
  const enter = (isLogin ? FadeInLeft : FadeInRight).duration(320).easing(Easing.out(Easing.cubic))

  return (
    <AuthLocaleGate>
      <AuthShell testID={isLogin ? 'e2e-login' : 'e2e-register'}>
        <AuthSegmented<AuthMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'login', label: t('auth.modeSignIn') },
            { value: 'register', label: t('auth.modeRegister') },
          ]}
        />
        <Animated.View key={mode} entering={enter}>
          {isLogin ? <LoginForm /> : <RegisterForm />}
        </Animated.View>
      </AuthShell>
    </AuthLocaleGate>
  )
}
