import { Children, type ReactNode, useMemo, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native'
import {
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  type LucideIcon,
  Search,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Pressable } from '@/components/ui/pressable'
import { Switch } from '@/components/ui/switch'
import { useThemeColors } from '@/hooks/useThemeColors'
import { ltrInputStyle } from '@/lib/rtl'
import { sizes } from '@/theme/sizes'
import { TYPE } from '@/theme/typography'

import { BottomSheet } from './sheet'
import type { Tone } from './tones'

/** Scrollable form body that stays clear of the keyboard. */
export function FormScroll({
  children,
  insetBottom = false,
}: {
  children: ReactNode
  /** Adds the home-indicator inset when nothing else sits under the form. */
  insetBottom?: boolean
}) {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5 pb-8 pt-3"
        contentContainerStyle={insetBottom ? { paddingBottom: 32 + insets.bottom } : undefined}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

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
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const isSecret = Boolean(input.secureTextEntry)
  const multiline = Boolean(input.multiline)
  const isLtrContent = isSecret || LTR_KEYBOARDS.has(input.keyboardType)
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
          style={isLtrContent ? ltrInputStyle() : undefined}
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

/** Wrapping single-select chips for short option sets. */
export function ChoiceField({
  label,
  options,
  value,
  onChange,
  allowClear = false,
  required,
  helper,
}: {
  label: string
  options: ChoiceOption[]
  value: string
  onChange: (value: string) => void
  /** Tapping the selected chip again clears it. */
  allowClear?: boolean
  required?: boolean
  helper?: string
}) {
  return (
    <View className="gap-2">
      <FieldLabel label={label} required={required} />
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`h-11 flex-row items-center gap-1.5 rounded-md border px-4 ${
                active ? 'border-foreground bg-foreground' : 'border-border bg-card active:bg-muted'
              }`}
              onPress={() => onChange(active && allowClear ? '' : option.value)}
            >
              {active ? <ActiveCheck /> : null}
              <Text
                className={`${TYPE.caption} font-medium ${active ? 'text-background' : 'text-ink-2'}`}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <FieldHint helper={helper} />
    </View>
  )
}

function ActiveCheck() {
  const colors = useThemeColors()
  return <Check size={14} color={colors.bg} strokeWidth={sizes.iconStrokeActive} />
}

/** Labeled switch row. */
export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string
  description?: string
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <View className="min-h-[60px] flex-row items-center gap-3 rounded-md border border-border bg-card px-4 py-3.5">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className={`${TYPE.bodyStrong} text-foreground`}>{label}</Text>
        {description ? <Text className={`${TYPE.micro} text-muted-2`}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
      />
    </View>
  )
}

/** Inline form-level error banner. */
export function FormError({ message }: { message?: string }) {
  const colors = useThemeColors()
  if (!message) return null
  return (
    <View
      className="flex-row items-start gap-2.5 rounded-md border-[1.5px] border-destructive bg-card px-4 py-3.5"
      accessibilityRole="alert"
    >
      <AlertCircle size={sizes.icon} color={colors.negative} strokeWidth={sizes.iconStroke} />
      <Text className={`${TYPE.bodyStrong} min-w-0 flex-1 text-foreground`}>{message}</Text>
    </View>
  )
}

/** Action bar pinned to the bottom of a form or detail screen. */
export function StickyFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View
      className="flex-row gap-3 bg-background px-5 pt-4"
      style={{ paddingBottom: Math.max(insets.bottom + 8, 20) }}
    >
      {children}
    </View>
  )
}

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

type SelectFieldProps = {
  label: string
  placeholder?: string
  options: ChoiceOption[]
  value: string
  onChange: (value: string) => void
  required?: boolean
  helper?: string
  /** Adds a "None" row that clears the value. */
  allowClear?: boolean
}

/** Picker for long option lists: opens a searchable bottom sheet. */
export function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
  helper,
  allowClear = false,
}: SelectFieldProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options
  }, [options, query])

  function choose(next: string) {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <View className="gap-1.5">
      <FieldLabel label={label} required={required} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder ?? t('common.select')}`}
        className="flex-row items-center gap-2 rounded-md border border-border bg-card px-4 active:bg-background"
        style={{ height: sizes.inputHeight }}
        onPress={() => setOpen(true)}
      >
        <Text
          className={`${TYPE.body} flex-1 ${selected ? 'text-foreground' : 'text-muted-2'}`}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder ?? t('common.select')}
        </Text>
        <ChevronDown size={sizes.iconSm} color={colors.muted} strokeWidth={sizes.iconStroke} />
      </Pressable>
      <FieldHint helper={helper} />

      <BottomSheet
        visible={open}
        onClose={() => {
          setOpen(false)
          setQuery('')
        }}
        title={label}
        maxHeightRatio={0.75}
      >
        {options.length > 8 ? (
          <View
            className="mb-3 flex-row items-center gap-3 rounded-md border border-border bg-background px-4"
            style={{ height: sizes.inputHeight }}
          >
            <Search size={sizes.iconSm} color={colors.muted} strokeWidth={sizes.iconStroke} />
            <TextInput
              className={`${TYPE.body} h-full flex-1 text-foreground`}
              value={query}
              onChangeText={setQuery}
              placeholder={t('common.search')}
              placeholderTextColor={colors.muted2}
              autoCorrect={false}
            />
          </View>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            allowClear && !query ? (
              <SheetOption
                label={t('common.none')}
                active={value === ''}
                onPress={() => choose('')}
              />
            ) : null
          }
          ListEmptyComponent={
            <Text className={`${TYPE.bodySm} py-6 text-muted-foreground`}>
              {t('common.nothingMatches')}
            </Text>
          }
          renderItem={({ item }) => (
            <SheetOption
              label={item.label}
              active={item.value === value}
              onPress={() => choose(item.value)}
            />
          )}
        />
      </BottomSheet>
    </View>
  )
}

function SheetOption({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  const colors = useThemeColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className="min-h-[52px] flex-row items-center gap-3 border-b border-line-subtle px-1 active:bg-background"
      onPress={onPress}
    >
      <Text
        className={`${TYPE.body} flex-1 text-foreground ${active ? 'font-medium' : ''}`}
        numberOfLines={1}
      >
        {label}
      </Text>
      {active ? (
        <Check size={sizes.iconSm} color={colors.accent} strokeWidth={sizes.iconStrokeActive} />
      ) : null}
    </Pressable>
  )
}

/**
 * Destructive action, last on a detail screen and separated from the rest
 * (archetype C): a section title, one line on the consequence, then the
 * destructive button. Confirmation happens in a dialog.
 */
export function DangerZone({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <View className="gap-3 border-t border-border pt-7">
      <View className="gap-0.5">
        <Text accessibilityRole="header" className={`${TYPE.section} text-foreground`}>
          {title}
        </Text>
        {hint ? <Text className={`${TYPE.caption} text-muted-foreground`}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  )
}
