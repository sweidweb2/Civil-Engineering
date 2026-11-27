import { Children, type ReactNode, useState } from 'react'
import { Text, TextInput, type TextInputProps, View } from 'react-native'
import { AlertCircle, Eye, EyeOff, type LucideIcon } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useIsAuthLocale } from '@/lib/authLocale'
import { ltrInputStyle } from '@/lib/rtl'
import { sizes } from '@/theme/sizes'
import { TYPE } from '@/theme/typography'

import type { Tone } from './tones'

/**
 * A short group of related fields: section title (+ caption) on `bg`, the
 * fields below. No card: hierarchy comes from type and space.
 */
export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  /** Kept for API compatibility; sections carry no decorative icon. */
  icon?: LucideIcon
  tone?: Tone
  children: ReactNode
}) {
  return (
    <View className="gap-3">
      <View className="gap-0.5">
        <Text accessibilityRole="header" className={`${TYPE.section} text-foreground`}>
          {title}
        </Text>
        {description ? (
          <Text className={`${TYPE.caption} text-muted-foreground`}>{description}</Text>
        ) : null}
      </View>
      <View className="gap-4">{children}</View>
    </View>
  )
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text className={`${TYPE.caption} text-ink-2`}>
      {label}
      {required ? <Text className="text-muted-foreground"> *</Text> : null}
    </Text>
  )
}

function FieldHint({ error, helper }: { error?: string; helper?: string }) {
  const colors = useThemeColors()
  if (error)
    return (
      <View className="flex-row items-center gap-1.5" accessibilityLiveRegion="polite">
        <AlertCircle size={14} color={colors.negative} strokeWidth={sizes.iconStroke} />
        <Text className={`${TYPE.micro} min-w-0 flex-1 text-destructive`}>{error}</Text>
      </View>
    )
  if (helper) return <Text className={`${TYPE.micro} text-muted-foreground`}>{helper}</Text>
  return null
}

type TextFieldProps = Omit<TextInputProps, 'className' | 'style'> & {
  label: string
  required?: boolean
  error?: string
  helper?: string
  icon?: LucideIcon
}

/** Keyboard types whose content is an LTR token (email, phone, URL) even in Arabic. */
const LTR_KEYBOARDS = new Set<TextInputProps['keyboardType']>([
  'email-address',
  'phone-pad',
  'url',
  'number-pad',
  'decimal-pad',
  'numeric',
  'numbers-and-punctuation',
])

/** Labeled text input. Pass `multiline` for a text area. */
export function TextField({
  label,
  required,
  error,
  helper,
  icon: Icon,
  ...input
}: TextFieldProps) {
  const colors = useThemeColors()
  const { t } = useTranslation()
  const isAuthLocale = useIsAuthLocale()
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const isSecret = Boolean(input.secureTextEntry)
  const multiline = Boolean(input.multiline)
  const isLtrContent = isAuthLocale || isSecret || LTR_KEYBOARDS.has(input.keyboardType)
  const borderClass = error
    ? 'border-[1.5px] border-destructive'
    : focused
      ? 'border-[1.5px] border-foreground'
      : 'border border-border'

  return (
    <View className="gap-1.5">
      <FieldLabel label={label} required={required} />
      <View
        className={`w-full min-w-0 flex-row gap-2 overflow-hidden rounded-md bg-card px-4 ${borderClass} ${
          multiline ? 'min-h-[112px] items-start py-3' : 'items-center'
        }`}
        style={multiline ? undefined : { height: sizes.inputHeight }}
      >
        {Icon ? (
          <Icon size={sizes.iconSm} color={colors.muted} strokeWidth={sizes.iconStroke} />
        ) : null}
        <TextInput
          {...input}
          secureTextEntry={isSecret && !revealed}
          className={`${TYPE.body} min-w-0 flex-1 text-foreground ${multiline ? '' : 'h-full'}`}
          placeholderTextColor={colors.muted2}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={isLtrContent ? ltrInputStyle({ forceLeft: isAuthLocale }) : undefined}
          accessibilityLabel={label}
          onFocus={(event) => {
            setFocused(true)
            input.onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            input.onBlur?.(event)
          }}
        />
        {isSecret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('auth.hidePassword') : t('auth.showPassword')}
            className="-me-3 items-center justify-center"
            style={{ width: sizes.touch, height: sizes.touch }}
            onPress={() => setRevealed((value) => !value)}
          >
            {revealed ? (
              <EyeOff size={sizes.iconSm} color={colors.muted} strokeWidth={sizes.iconStroke} />
            ) : (
              <Eye size={sizes.iconSm} color={colors.muted} strokeWidth={sizes.iconStroke} />
            )}
          </Pressable>
        ) : null}
      </View>
      <FieldHint error={error} helper={helper} />
    </View>
  )
}

/** Two fields side by side. */
export function FieldRow({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row gap-3">
      {Children.map(children, (child) => (
        <View className="min-w-0 flex-1">{child}</View>
      ))}
    </View>
  )
}

export type ChoiceOption = { value: string; label: string }

/** Equal-width tab switcher for in-screen sections. */
export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: ChoiceOption[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <View className="flex-row rounded-md bg-muted p-1" accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`h-11 flex-1 items-center justify-center rounded-[10px] ${
              active ? 'border border-border bg-card' : ''
            }`}
            onPress={() => onChange(option.value)}
          >
            <Text
              className={`${TYPE.caption} ${
                active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
