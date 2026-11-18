import { useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import Constants from 'expo-constants'
import { LogOut, Monitor, Moon, Sun } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { useAccountDetails, usePasswordChange } from '@/features/account/AccountForms'
import { useLogout } from '@/features/portals/LogoutButton'
import { WkField, WkPasswordField } from '@/features/worker/ui/forms'
import {
  WkButton,
  WkCard,
  WkConfirm,
  type WkConfirmState,
  WkGroup,
  WkGroupLabel,
  WkTabScroll,
} from '@/features/worker/ui/kit'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { directionNeedsRestart } from '@/i18n'
import { enumLabel } from '@/i18n/labels'
import { ltr } from '@/lib/rtl'
import { userDisplayName } from '@/lib/user'
import { type AppLanguage, useLanguageStore } from '@/stores/languageStore'
import { type ThemeMode, useThemeStore } from '@/stores/themeStore'

const THEMES: { value: ThemeMode; icon: typeof Sun }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
]

const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')
  ).toUpperCase()
}

/** Worker-portal account: details / security tabs, appearance, language, log out. */
export function WorkerAccountScreen() {
  const { t } = useTranslation()
  const { c, shadow } = useWorkerPalette()
  const [tab, setTab] = useState<'details' | 'security'>('details')
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)
  const details = useAccountDetails()
  const password = usePasswordChange()
  const { isLoggingOut, logoutNow } = useLogout()
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const language = useLanguageStore((s) => s.language)
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  const user = details.user
  const name = user ? userDisplayName(user) : t('account.title')
  const version = Constants.expoConfig?.version

  function chooseLanguage(next: AppLanguage) {
    if (next === language) return
    if (!directionNeedsRestart(next)) {
      setLanguage(next)
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
        setLanguage(next)
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
    <WkTabScroll testID="e2e-worker-account">
      {/* Identity */}
      <WkCard className="flex-row items-center gap-3.5 rounded-[26px] p-5">
        <View className="size-14 items-center justify-center rounded-full bg-wk-hero">
          <Text className="text-[19px] font-semibold text-wk-lime">{initialsOf(name)}</Text>
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-[17px] font-semibold text-wk-ink" numberOfLines={1}>
            {name}
          </Text>
          {user ? (
            <Text className="text-[13px] text-wk-ink2" numberOfLines={1}>
              {enumLabel(t, 'role', user.role)} · {ltr(user.email)}
            </Text>
          ) : null}
        </View>
      </WkCard>

      {/* Details / Security */}
      <View className="flex-row rounded-[14px] bg-wk-sf2 p-1" accessibilityRole="tablist">
        {(['details', 'security'] as const).map((value) => {
          const on = tab === value
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setTab(value)}
              className={`h-10 flex-1 items-center justify-center rounded-[10px] ${on ? 'bg-wk-sf' : ''}`}
              style={on ? { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : undefined}
            >
              <Text className={`text-[15px] font-medium ${on ? 'text-wk-ink' : 'text-wk-ink3'}`}>
                {value === 'details' ? t('profile.account') : t('profile.security')}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {tab === 'details' ? (
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
      ) : (
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
      )}

      {/* Appearance */}
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

      {/* Language */}
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

      {/* Log out */}
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
    </WkTabScroll>
  )
}
