import { useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import Constants from 'expo-constants'
import { LogOut, Monitor, Moon, Sun } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { useLogout } from '@/components/LogoutButton'
import { Pressable } from '@/components/ui/pressable'
import { useAccountDetails, usePasswordChange } from '@/features/account/AccountForms'
import { directionNeedsRestart, switchAppLanguage } from '@/i18n'
import { ltr } from '@/lib/rtl'
import { type AppLanguage, useLanguageStore } from '@/stores/languageStore'
import { type ThemeMode, useThemeStore } from '@/stores/themeStore'

import { WkField, WkPasswordField } from './forms'
import { WkButton, WkCard, WkConfirm, type WkConfirmState, WkGroup, WkGroupLabel } from './kit'
import { useWkPalette } from './palette'

/**
 * Account blocks shared by the portals on the green palette (worker, provider):
 * segmented tabs, details / password cards, appearance, language, log out.
 */

const THEMES: { value: ThemeMode; icon: typeof Sun }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
]

const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
]

/** iOS-style segmented control on a sunken track. */
export function WkSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View className="flex-row rounded-[14px] bg-wk-sf2 p-1" accessibilityRole="tablist">
      {options.map((option) => {
        const on = value === option.value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.value)}
            className={`h-10 flex-1 items-center justify-center rounded-[10px] ${on ? 'bg-wk-sf' : ''}`}
            style={on ? { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : undefined}
          >
            <Text
              className={`text-[15px] font-medium ${on ? 'text-wk-ink' : 'text-wk-ink3'}`}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** First / last / display name + phone for the signed-in user. */
export function WkAccountDetailsCard() {
  const { t } = useTranslation()
  const details = useAccountDetails()
  return (
    <WkCard className="gap-4">
      <WkField
        label={t('common.firstName')}
        value={details.form.firstName}
        onChangeText={(value) => details.set('firstName', value)}
        error={details.errors.firstName}
      />
      <WkField
        label={t('common.lastName')}
        value={details.form.lastName}
        onChangeText={(value) => details.set('lastName', value)}
        error={details.errors.lastName}
      />
      <WkField
        label={t('common.displayName')}
        value={details.form.displayName ?? ''}
        onChangeText={(value) => details.set('displayName', value)}
        error={details.errors.displayName}
        hint={t('account.displayNameHint')}
      />
      <WkField
        label={t('common.phone')}
        value={details.form.phone ?? ''}
        onChangeText={(value) => details.set('phone', value)}
        error={details.errors.phone}
        keyboardType="phone-pad"
        ltr
      />
      <WkButton
        label={t('account.saveDetails')}
        loading={details.isSaving}
        onPress={() => void details.onSave()}
      />
    </WkCard>
  )
}

/** Current / new / confirm password. */
export function WkPasswordCard() {
  const { t } = useTranslation()
  const password = usePasswordChange()
  return (
    <WkCard className="gap-4">
      <WkPasswordField
        label={t('account.currentPassword')}
        required
        value={password.form.currentPassword}
        onChangeText={(value) => password.set('currentPassword', value)}
        error={password.errors.currentPassword}
      />
      <WkPasswordField
        label={t('account.newPassword')}
        required
        value={password.form.newPassword}
        onChangeText={(value) => password.set('newPassword', value)}
        error={password.errors.newPassword}
        hint={t('account.passwordHint')}
      />
      <WkPasswordField
        label={t('account.confirmPassword')}
        required
        value={password.form.confirmPassword}
        onChangeText={(value) => password.set('confirmPassword', value)}
        error={password.errors.confirmPassword}
      />
      <WkButton
        label={t('account.updatePassword')}
        loading={password.isSaving}
        onPress={() => void password.onSave()}
      />
    </WkCard>
  )
}

/** Appearance tiles, language radio group, log out row and app version. */
export function WkPreferences() {
  const { t } = useTranslation()
  const { c, shadow } = useWkPalette()
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)
  const { isLoggingOut, logoutNow } = useLogout()
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const language = useLanguageStore((s) => s.language)
  const version = Constants.expoConfig?.version

  function chooseLanguage(next: AppLanguage) {
    if (next === language) return
    if (!directionNeedsRestart(next)) {
      void switchAppLanguage(next)
      return
    }
    setConfirm({
      title: t('worker.switchLanguage', {
        language: LANGUAGES.find((l) => l.value === next)?.label,
      }),
      body: t('worker.switchLanguageBody'),
      cta: t('worker.switchLanguageCta'),
      tone: 'brand',
      onConfirm: () => {
        setConfirm(null)
        void switchAppLanguage(next)
      },
    })
  }

  function askLogout() {
    setConfirm({
      title: t('account.logoutTitle'),
      body: t('account.logoutBody'),
      cta: t('account.logout'),
      onConfirm: () => {
        setConfirm(null)
        void logoutNow()
      },
    })
  }

  return (
    <>
      <WkGroupLabel>{t('account.appearance')}</WkGroupLabel>
      <View className="flex-row gap-2" accessibilityRole="radiogroup">
        {THEMES.map(({ value, icon: Icon }) => {
          const on = mode === value
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setMode(value)}
              className={`h-[72px] flex-1 items-center justify-center gap-1.5 rounded-2xl border-[1.5px] bg-wk-sf ${
                on ? 'border-wk-brand' : 'border-wk-line'
              }`}
            >
              <Icon size={20} color={on ? c.brand : c.ink3} strokeWidth={1.9} />
              <Text className="text-[13px] font-medium text-wk-ink">
                {t(`account.theme.${value}`)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <WkGroupLabel>{t('account.language')}</WkGroupLabel>
      <WkGroup>
        {LANGUAGES.map((lang) => {
          const on = language === lang.value
          return (
            <Pressable
              key={lang.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => chooseLanguage(lang.value)}
              className="min-h-14 flex-row items-center gap-3.5 bg-wk-sf px-4 active:bg-wk-sf2"
            >
              <Text className="min-w-0 flex-1 text-[15px] font-medium text-wk-ink">
                {lang.label}
              </Text>
              <View
                className={`size-[22px] items-center justify-center rounded-full border-2 ${
                  on ? 'border-wk-brand' : 'border-wk-line2'
                }`}
              >
                {on ? <View className="size-2.5 rounded-full bg-wk-brand" /> : null}
              </View>
            </Pressable>
          )
        })}
      </WkGroup>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('account.logout')}
        accessibilityState={{ busy: isLoggingOut, disabled: isLoggingOut }}
        disabled={isLoggingOut}
        onPress={askLogout}
        className="min-h-14 flex-row items-center gap-3 rounded-[20px] bg-wk-sf px-4 active:bg-wk-red-soft"
        style={shadow}
      >
        {isLoggingOut ? (
          <ActivityIndicator size="small" color={c.red} />
        ) : (
          <LogOut size={18} color={c.red} strokeWidth={1.9} />
        )}
        <Text className="text-[15px] font-medium text-wk-red">
          {isLoggingOut ? t('account.loggingOut') : t('account.logout')}
        </Text>
      </Pressable>

      {version ? (
        <Text
          className="text-center text-[11px] font-medium text-wk-ink3"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {ltr(`v ${version}`)}
        </Text>
      ) : null}

      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </>
  )
}
