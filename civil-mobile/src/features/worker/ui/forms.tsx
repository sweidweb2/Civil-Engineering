import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native'
import {
  Check,
  ChevronDown,
  CircleAlert,
  Eye,
  EyeOff,
  type LucideIcon,
  Search,
  Trash2,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated'

import { BottomSheet } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { isRtlLayout } from '@/lib/rtl'
import { errorMessage } from '@/services/feedback'

import { WkBodyScroll, WkButton, WkCard, WkError, WkFooter, WkSkeletonCard, WkTopBar } from './kit'
import { useWorkerPalette } from './palette'

/* ─── Screen ───────────────────────────────────────────────────────────── */

/** Pushed form screen: top bar, loading / error states, body, pinned save. */
export function WkFormScreen({
  title,
  count,
  backHref,
  isLoading,
  error,
  onRetry,
  footer,
  children,
  testID,
}: {
  title: string
  /** Mono label on the right of the top bar (code, "3 / 5"). */
  count?: string
  backHref: string
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  footer?: ReactNode
  children: ReactNode
  testID?: string
}) {
  const { t } = useTranslation()
  return (
    <View className="flex-1 bg-wk-bg" testID={testID}>
      <WkTopBar title={title} backHref={backHref} count={count} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLoading ? (
          <View className="gap-3.5 px-5 pt-2">
            <WkSkeletonCard />
            <WkSkeletonCard />
          </View>
        ) : error ? (
          <View className="px-5 pt-2">
            <WkError message={errorMessage(error, t('common.errorGeneric'))} onRetry={onRetry} />
          </View>
        ) : (
          <>
            <WkBodyScroll>{children}</WkBodyScroll>
            {footer ? <WkFooter>{footer}</WkFooter> : null}
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  )
}

/* ─── Sections ─────────────────────────────────────────────────────────── */

/** Card with an icon tile + title, holding a group of fields. */
export function WkSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  const { c } = useWorkerPalette()
  return (
    <WkCard className="gap-4">
      <View className="flex-row items-center gap-2.5">
        <View className="size-8 items-center justify-center rounded-[10px] bg-wk-brand-soft">
          <Icon size={16} color={c.brand} strokeWidth={2} />
        </View>
        <Text className="text-[15px] font-semibold text-wk-ink" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </WkCard>
  )
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text className="text-[13px] font-medium text-wk-ink2">
      {label}
      {required ? <Text className="text-wk-red"> *</Text> : null}
    </Text>
  )
}

function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  const { c } = useWorkerPalette()
  if (error) {
    return (
      <View className="flex-row items-center gap-1.5" accessibilityLiveRegion="polite">
        <CircleAlert size={14} color={c.red} strokeWidth={2} />
        <Text className="min-w-0 flex-1 text-[13px] font-medium text-wk-red">{error}</Text>
      </View>
    )
  }
  if (hint) return <Text className="text-[13px] leading-[18px] text-wk-ink3">{hint}</Text>
  return null
}

/* ─── Inputs ───────────────────────────────────────────────────────────── */

type WkFieldProps = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  label: string
  value: string
  onChangeText: (value: string) => void
  error?: string
  hint?: string
  required?: boolean
  /** Numbers, dates, URLs, codes: keep left-to-right even in Arabic. */
  ltr?: boolean
}

export function WkField({
  label,
  value,
  onChangeText,
  error,
  hint,
  required,
  ltr,
  multiline,
  ...input
}: WkFieldProps) {
  const { c } = useWorkerPalette()
  const [focused, setFocused] = useState(false)
  const border = error ? 'border-wk-red' : focused ? 'border-wk-brand' : 'border-wk-line'
  return (
    <View className="gap-2">
      <FieldLabel label={label} required={required} />
      <TextInput
        {...input}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={c.ink3}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-xl border px-3.5 text-[15px] text-wk-ink ${border} ${
          focused ? 'bg-wk-sf' : 'bg-wk-sf2'
        } ${multiline ? 'min-h-[112px] py-3 leading-[22px]' : 'h-12'}`}
        style={
          ltr ? { textAlign: isRtlLayout() ? 'right' : 'left', writingDirection: 'ltr' } : undefined
        }
        onFocus={(e) => {
          setFocused(true)
          input.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          input.onBlur?.(e)
        }}
      />
      <FieldMessage error={error} hint={hint} />
    </View>
  )
}

/** Password input with a show / hide eye button. */
export function WkPasswordField({
  label,
  value,
  onChangeText,
  error,
  hint,
  placeholder,
  required,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  error?: string
  hint?: string
  placeholder?: string
  required?: boolean
}) {
  const { t } = useTranslation()
  const { c } = useWorkerPalette()
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const border = error ? 'border-wk-red' : focused ? 'border-wk-brand' : 'border-wk-line'
  return (
    <View className="gap-2">
      <FieldLabel label={label} required={required} />
      <View
        className={`h-12 flex-row items-center rounded-xl border ps-3.5 ${border} ${
          focused ? 'bg-wk-sf' : 'bg-wk-sf2'
        }`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!revealed}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={placeholder}
          placeholderTextColor={c.ink3}
          accessibilityLabel={label}
          className="h-full min-w-0 flex-1 text-[15px] text-wk-ink"
          style={{ writingDirection: 'ltr', textAlign: isRtlLayout() ? 'right' : 'left' }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={revealed ? t('auth.hidePassword') : t('auth.showPassword')}
          onPress={() => setRevealed((v) => !v)}
          className="size-11 items-center justify-center"
        >
          {revealed ? (
            <EyeOff size={18} color={c.ink3} strokeWidth={1.9} />
          ) : (
            <Eye size={18} color={c.ink3} strokeWidth={1.9} />
          )}
        </Pressable>
      </View>
      <FieldMessage error={error} hint={hint} />
    </View>
  )
}

/** Field-shaped button that opens a picker. */
export function WkSelect({
  label,
  value,
  placeholder,
  onPress,
  error,
  required,
}: {
  label: string
  value?: string | null
  placeholder: string
  onPress: () => void
  error?: string
  required?: boolean
}) {
  const { c } = useWorkerPalette()
  return (
    <View className="gap-2">
      <FieldLabel label={label} required={required} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={onPress}
        className={`h-12 flex-row items-center justify-between gap-2 rounded-xl border bg-wk-sf2 pe-3 ps-3.5 active:bg-wk-sf ${
          error ? 'border-wk-red' : 'border-wk-line'
        }`}
      >
        <Text
          className={`min-w-0 flex-1 text-[15px] ${value ? 'text-wk-ink' : 'text-wk-ink3'}`}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color={c.ink3} strokeWidth={1.9} />
      </Pressable>
      <FieldMessage error={error} />
    </View>
  )
}

export type WkOption = { value: string; label: string }

/** Wrapping pill buttons; the selected one is filled with ink. */
export function WkChoice({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string
  options: WkOption[]
  value: string | null
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <View className="gap-2">
      <FieldLabel label={label} />
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {options.map((option) => {
          const on = option.value === value
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(option.value)}
              className={`h-11 justify-center rounded-xl px-4 ${on ? 'bg-wk-ink' : 'bg-wk-sf2 active:opacity-70'}`}
            >
              <Text className={`text-[15px] font-medium ${on ? 'text-wk-bg' : 'text-wk-ink2'}`}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <FieldMessage error={error} />
    </View>
  )
}

/** Label + hint with the design's green switch. */
export function WkToggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  const { c } = useWorkerPalette()
  const dir = isRtlLayout() ? -1 : 1
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(value ? 20 * dir : 0, { damping: 14, stiffness: 220 }) }],
  }))
  const track = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? c.brand : c.line2, { duration: 180 }),
  }))
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      className="min-h-12 flex-row items-center gap-3.5"
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[15px] font-medium text-wk-ink">{label}</Text>
        {hint ? <Text className="text-[13px] leading-[19px] text-wk-ink3">{hint}</Text> : null}
      </View>
      <Animated.View className="h-[30px] w-[50px] rounded-[15px] p-[3px]" style={track}>
        <Animated.View
          className="size-6 rounded-full bg-white"
          style={[knob, { boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }]}
        />
      </Animated.View>
    </Pressable>
  )
}

/** Red-outlined card with the delete action for an existing entry. */
export function WkDangerZone({
  title,
  body,
  label,
  onPress,
  disabled,
}: {
  title: string
  body: string
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-[22px] border border-wk-red-soft bg-wk-sf p-[18px]">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[15px] font-semibold text-wk-red">{title}</Text>
        <Text className="text-[13px] text-wk-ink3">{body}</Text>
      </View>
      <WkButton
        label={label}
        icon={Trash2}
        variant="dangerSoft"
        height={44}
        compact
        disabled={disabled}
        onPress={onPress}
      />
    </View>
  )
}

/* ─── Picker sheet ─────────────────────────────────────────────────────── */

/** Searchable single-choice list in a bottom sheet (trade picker). */
export function WkPickerSheet({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
  searchPlaceholder,
  emptyLabel,
  isLoading,
}: {
  visible: boolean
  onClose: () => void
  title: string
  options: WkOption[]
  value?: string | null
  onSelect: (option: WkOption) => void
  searchPlaceholder: string
  emptyLabel: (query: string) => string
  isLoading?: boolean
}) {
  const { c } = useWorkerPalette()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (visible) setQuery('')
  }, [visible])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  }, [options, query])

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} maxHeightRatio={0.78}>
      <View className="mb-3 h-12 flex-row items-center gap-2.5 rounded-xl border border-wk-line bg-wk-sf2 px-3.5">
        <Search size={17} color={c.ink3} strokeWidth={1.9} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={c.ink3}
          accessibilityLabel={searchPlaceholder}
          autoCorrect={false}
          className="h-full min-w-0 flex-1 text-[15px] text-wk-ink"
        />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-4">
        {isLoading ? (
          <View className="gap-2 py-2">
            <WkSkeletonCard />
          </View>
        ) : filtered.length === 0 ? (
          <Text className="p-8 text-center text-[15px] text-wk-ink3">
            {emptyLabel(query.trim())}
          </Text>
        ) : (
          filtered.map((option) => {
            const on = option.value === value
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => onSelect(option)}
                className={`min-h-[52px] flex-row items-center justify-between gap-3 rounded-xl px-3 ${
                  on ? 'bg-wk-brand-soft' : 'active:bg-wk-sf2'
                }`}
              >
                <Text
                  className={`min-w-0 flex-1 text-[15px] text-wk-ink ${on ? 'font-semibold' : ''}`}
                >
                  {option.label}
                </Text>
                {on ? <Check size={18} color={c.brand} strokeWidth={2.2} /> : null}
              </Pressable>
            )
          })
        )}
      </ScrollView>
    </BottomSheet>
  )
}
