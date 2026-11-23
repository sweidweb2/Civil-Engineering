import { useRef, useState } from 'react'
import { Text, type TextInputInstance, View } from 'react-native'
import { router } from 'expo-router'
import {
  BriefcaseBusiness,
  ClipboardList,
  HardHat,
  Lock,
  type LucideIcon,
  Mail,
  UserRound,
} from 'lucide-react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { registerSchema } from '@/features/auth/register.schema'
import { useAuthTranslation } from '@/features/auth/useAuthTranslation'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { type FieldErrors, parseForm } from '@/lib/form'
import { homePathForRole } from '@/navigation'
import type { RegisterRole } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

import { EMAIL_SHAPE } from './LoginForm'
import { AuthButton, AuthField, PasswordChecklist, RoleTile } from './ui'

const ROLES: { value: RegisterRole; icon: LucideIcon; labelKey: string }[] = [
  { value: 'CLIENT', icon: BriefcaseBusiness, labelKey: 'auth.roleClient' },
  { value: 'MANAGER', icon: ClipboardList, labelKey: 'auth.roleManagerShort' },
  { value: 'WORKER', icon: HardHat, labelKey: 'auth.roleWorker' },
]

/**
 * One short form: account type tiles, name, email, password (with live rule
 * chips). Submits exactly what the previous form did.
 */
export function RegisterForm() {
  const { t } = useAuthTranslation()
  const register = useAuthStore((s) => s.register)
  const handleApiError = useHandleApiError()
  const lastNameRef = useRef<TextInputInstance>(null)
  const emailRef = useRef<TextInputInstance>(null)
  const passwordRef = useRef<TextInputInstance>(null)

  const [role, setRole] = useState<RegisterRole>('CLIENT')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const rules = [
    { label: t('auth.ruleLength'), met: password.length >= 8 },
    { label: t('auth.ruleLetter'), met: /[A-Za-z]/.test(password) },
    { label: t('auth.ruleNumber'), met: /[0-9]/.test(password) },
  ]

  function clearError(key: string) {
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function onSubmit() {
    if (isSubmitting) return
    const parsed = parseForm(registerSchema(t), { firstName, lastName, email, password, role })
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const result = await register({
        email: parsed.data.email,
        password: parsed.data.password,
        firstName: parsed.data.firstName || undefined,
        lastName: parsed.data.lastName || undefined,
        role: parsed.data.role,
      })
      if (result.pendingApproval) {
        router.replace('/pending-approval' as never)
        return
      }
      const nextRole = useAuthStore.getState().user?.role
      router.replace(homePathForRole(nextRole) as never)
    } catch (error) {
      handleApiError(error, t('auth.couldNotRegister'), t('auth.couldNotRegister'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View className="gap-5">
      <View className="gap-2">
        <Text className="text-[13px] font-medium text-wk-ink2">{t('auth.role')}</Text>
        <View className="flex-row gap-2.5" accessibilityRole="radiogroup">
          {ROLES.map((r) => (
            <RoleTile
              key={r.value}
              icon={r.icon}
              label={t(r.labelKey)}
              selected={role === r.value}
              onPress={() => setRole(r.value)}
            />
          ))}
        </View>
        {role !== 'CLIENT' ? (
          <Animated.View entering={FadeIn.duration(200)} className="flex-row items-center gap-1.5">
            <View className="size-1.5 rounded-full bg-wk-amber" />
            <Text className="text-[12px] font-medium text-wk-amber">
              {t('auth.accessApproval')}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <View className="flex-row gap-3">
        <View className="min-w-0 flex-1">
          <AuthField
            label={t('auth.firstName')}
            icon={UserRound}
            error={fieldErrors.firstName}
            placeholder={t('auth.firstName')}
            autoComplete="given-name"
            textContentType="givenName"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => lastNameRef.current?.focus()}
            value={firstName}
            onChangeText={(v) => {
              setFirstName(v)
              clearError('firstName')
            }}
          />
        </View>
        <View className="min-w-0 flex-1">
          <AuthField
            inputRef={lastNameRef}
            label={t('auth.lastName')}
            icon={UserRound}
            error={fieldErrors.lastName}
            placeholder={t('auth.lastName')}
            autoComplete="family-name"
            textContentType="familyName"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => emailRef.current?.focus()}
            value={lastName}
            onChangeText={(v) => {
              setLastName(v)
              clearError('lastName')
            }}
          />
        </View>
      </View>

      <AuthField
        inputRef={emailRef}
        label={t('auth.email')}
        icon={Mail}
        error={fieldErrors.email}
        valid={EMAIL_SHAPE.test(email.trim())}
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        value={email}
        onChangeText={(v) => {
          setEmail(v)
          clearError('email')
        }}
      />

      <View className="gap-3">
        <AuthField
          inputRef={passwordRef}
          label={t('auth.password')}
          icon={Lock}
          error={fieldErrors.password}
          placeholder={t('auth.newPasswordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void onSubmit()}
          value={password}
          onChangeText={(v) => {
            setPassword(v)
            clearError('password')
          }}
        />
        {password ? <PasswordChecklist rules={rules} /> : null}
      </View>

      <View className="pt-1">
        <AuthButton
          testID="e2e-register-submit"
          label={isSubmitting ? t('auth.creating') : t('auth.createAccount')}
          loading={isSubmitting}
          onPress={() => void onSubmit()}
        />
      </View>
    </View>
  )
}
