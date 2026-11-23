import { useMemo, useRef, useState } from 'react'
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
import Animated, { Easing, FadeInLeft, FadeInRight } from 'react-native-reanimated'

import { Pressable } from '@/components/ui/pressable'
import { registerSchema } from '@/features/auth/register.schema'
import { useAuthTranslation } from '@/features/auth/useAuthTranslation'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { type FieldErrors, parseForm } from '@/lib/form'
import { homePathForRole } from '@/navigation'
import type { RegisterRole } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

import { EMAIL_SHAPE } from './LoginForm'
import { AuthButton, AuthField, PasswordChecklist, RoleCard, StepHeader } from './ui'

type RoleMeta = {
  value: RegisterRole
  icon: LucideIcon
  title: string
  description: string
  instant: boolean
}

/**
 * Two steps: 1) pick the account type (role cards that say up front whether
 * it needs admin approval), 2) name, email and password with a live rule
 * checklist. Submits exactly what the old single form did.
 */
export function RegisterForm() {
  const { t } = useAuthTranslation()
  const { c } = useWorkerPalette()
  const register = useAuthStore((s) => s.register)
  const handleApiError = useHandleApiError()
  const lastNameRef = useRef<TextInputInstance>(null)
  const emailRef = useRef<TextInputInstance>(null)
  const passwordRef = useRef<TextInputInstance>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<RegisterRole>('CLIENT')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const roles = useMemo<RoleMeta[]>(
    () => [
      {
        value: 'CLIENT',
        icon: BriefcaseBusiness,
        title: t('auth.roleClient'),
        description: t('auth.roleClientDesc'),
        instant: true,
      },
      {
        value: 'MANAGER',
        icon: ClipboardList,
        title: t('auth.roleManager'),
        description: t('auth.roleManagerDesc'),
        instant: false,
      },
      {
        value: 'WORKER',
        icon: HardHat,
        title: t('auth.roleWorker'),
        description: t('auth.roleWorkerDesc'),
        instant: false,
      },
    ],
    [t],
  )
  const selected = roles.find((r) => r.value === role) ?? roles[0]

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

  const enter = (step === 1 ? FadeInLeft : FadeInRight)
    .duration(300)
    .easing(Easing.out(Easing.cubic))

  if (step === 1) {
    return (
      <Animated.View key="role" entering={enter} className="gap-5">
        <StepHeader
          step={1}
          total={2}
          stepLabel={t('auth.stepOf', { step: 1, total: 2 })}
          title={t('auth.stepRoleTitle')}
          subtitle={t('auth.stepRoleSub')}
        />
        <View className="gap-3" accessibilityRole="radiogroup" accessibilityLabel={t('auth.role')}>
          {roles.map((r) => (
            <RoleCard
              key={r.value}
              icon={r.icon}
              title={r.title}
              description={r.description}
              access={r.instant ? t('auth.accessInstant') : t('auth.accessApproval')}
              accessTone={r.instant ? 'green' : 'amber'}
              selected={role === r.value}
              onPress={() => setRole(r.value)}
            />
          ))}
        </View>
        <AuthButton label={t('auth.continue')} onPress={() => setStep(2)} />
      </Animated.View>
    )
  }

  const SelectedIcon = selected.icon

  return (
    <Animated.View key="details" entering={enter} className="gap-5">
      <StepHeader
        step={2}
        total={2}
        stepLabel={t('auth.stepOf', { step: 2, total: 2 })}
        title={t('auth.stepDetailsTitle')}
        subtitle={t('auth.stepDetailsSub')}
        onBack={() => setStep(1)}
        backLabel={t('auth.back')}
      />

      {/* Chosen account type, one tap to change. */}
      <View className="flex-row items-center gap-3 rounded-2xl bg-wk-sf2 py-2.5 pe-2 ps-3">
        <View className="size-8 items-center justify-center rounded-xl bg-wk-brand">
          <SelectedIcon size={16} color={c.onBrand} strokeWidth={2} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[12px] text-wk-ink3">{t('auth.role')}</Text>
          <Text className="text-[14px] font-semibold text-wk-ink" numberOfLines={1}>
            {selected.title}
            <Text className={`font-medium ${selected.instant ? 'text-wk-brand' : 'text-wk-amber'}`}>
              {'  ·  '}
              {selected.instant ? t('auth.accessInstant') : t('auth.accessApproval')}
            </Text>
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setStep(1)}
          className="h-9 justify-center rounded-xl px-3 active:bg-wk-sf"
        >
          <Text className="text-[13px] font-semibold text-wk-brand">{t('auth.change')}</Text>
        </Pressable>
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
        <PasswordChecklist rules={rules} />
      </View>

      <View className="pt-1">
        <AuthButton
          testID="e2e-register-submit"
          label={isSubmitting ? t('auth.creating') : t('auth.createAccount')}
          loading={isSubmitting}
          onPress={() => void onSubmit()}
        />
      </View>
    </Animated.View>
  )
}
