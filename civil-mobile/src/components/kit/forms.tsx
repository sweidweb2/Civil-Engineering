import { Children, type ReactNode, useMemo, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
  X,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Pressable } from '@/components/ui/pressable'
import { Switch } from '@/components/ui/switch'
import { useThemeColors } from '@/hooks/useThemeColors'
import { softShadows } from '@/theme/shadows'

import { IconTile } from './primitives'
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
        contentContainerClassName="gap-4 px-5 pb-8 pt-2"
        contentContainerStyle={insetBottom ? { paddingBottom: 32 + insets.bottom } : undefined}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/** Titled card grouping related fields. */
export function Section({
  title,
  description,
  icon,
  tone = 'primary',
  children,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  tone?: Tone
  children: ReactNode
}) {
  return (
    <View
      className="gap-5 rounded-3xl border border-border/40 bg-card p-5"
      style={softShadows.card}
    >
      <View className="flex-row items-center gap-3">
        {icon ? <IconTile icon={icon} tone={tone} size={40} /> : null}
        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold text-foreground">{title}</Text>
          {description ? (
            <Text className="text-xs text-muted-foreground">{description}</Text>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  )
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text className="text-sm font-semibold text-foreground">
      {label}
      {required ? <Text className="text-destructive"> *</Text> : null}
    </Text>
  )
}

function FieldHint({ error, helper }: { error?: string; helper?: string }) {
  if (error) return <Text className="text-xs font-medium text-destructive">{error}</Text>
  if (helper) return <Text className="text-xs text-muted-foreground">{helper}</Text>
  return null
}

type TextFieldProps = Omit<TextInputProps, 'className' | 'style'> & {
  label: string
  required?: boolean
  error?: string
  helper?: string
  icon?: LucideIcon
}

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
  const borderClass = error ? 'border-destructive' : focused ? 'border-primary' : 'border-border'

  return (
    <View className="gap-1.5">
      <FieldLabel label={label} required={required} />
      <View
        className={`w-full min-w-0 flex-row gap-2 overflow-hidden rounded-2xl border-[1.5px] bg-background px-4 ${borderClass} ${
          multiline ? 'min-h-[112px] items-start py-3.5' : 'h-14 items-center'
        }`}
      >
        {Icon ? <Icon size={18} color={focused ? colors.primary : colors.textMuted} /> : null}
        <TextInput
          {...input}
          secureTextEntry={isSecret && !revealed}
          className={`min-w-0 flex-1 text-base text-foreground ${multiline ? '' : 'h-full'}`}
          placeholderTextColor={colors.disabled}
          textAlignVertical={multiline ? 'top' : 'center'}
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
            hitSlop={10}
            onPress={() => setRevealed((value) => !value)}
          >
            {revealed ? (
              <EyeOff size={18} color={colors.textMuted} />
            ) : (
              <Eye size={18} color={colors.textMuted} />
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
              className={`h-10 flex-row items-center gap-1.5 rounded-full border px-4 ${
                active ? 'border-primary bg-primary/10' : 'border-border bg-background'
              }`}
              onPress={() => onChange(active && allowClear ? '' : option.value)}
            >
              {active ? <ActiveCheck /> : null}
              <Text
                className={`text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}
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
  return <Check size={14} color={colors.primary} />
}

/** Labeled switch row. */
export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string
  description?: string
  value: boolean
  onValueChange: (value: boolean) => void
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-3">
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-foreground">{label}</Text>
        {description ? <Text className="text-xs text-muted-foreground">{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  )
}

/** Inline form-level error banner. */
export function FormError({ message }: { message?: string }) {
  const colors = useThemeColors()
  if (!message) return null
  return (
    <View className="flex-row items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3">
      <AlertCircle size={18} color={colors.error} />
      <Text className="flex-1 text-sm font-medium text-destructive">{message}</Text>
    </View>
  )
}

/** Action bar pinned to the bottom of a form or detail screen. */
export function StickyFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View
      className="flex-row gap-3 rounded-t-[28px] border-t border-border/40 bg-card px-5 pt-4"
      style={[softShadows.float, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}
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
    <View className="flex-row rounded-full bg-muted p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`h-11 flex-1 items-center justify-center rounded-full ${
              active ? 'bg-card' : ''
            }`}
            style={active ? softShadows.card : undefined}
            onPress={() => onChange(option.value)}
          >
            <Text
              className={`text-sm font-semibold ${
                active ? 'text-primary' : 'text-muted-foreground'
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
  const insets = useSafeAreaInsets()
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
        className="h-12 flex-row items-center gap-2 rounded-2xl border border-border bg-background px-3.5"
        onPress={() => setOpen(true)}
      >
        <Text
          className={`flex-1 text-base ${selected ? 'text-foreground' : 'text-muted-foreground'}`}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder ?? t('common.select')}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>
      <FieldHint helper={helper} />

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable
            accessibilityLabel={t('common.close')}
            className="flex-1"
            onPress={() => setOpen(false)}
          />
          <View
            className="max-h-[75%] rounded-t-[32px] bg-card px-5 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-border" />
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                hitSlop={8}
                className="size-9 items-center justify-center rounded-full bg-muted"
                onPress={() => setOpen(false)}
              >
                <X size={18} color={colors.text} />
              </Pressable>
            </View>

            {options.length > 8 ? (
              <View className="mb-2 h-11 flex-row items-center gap-2 rounded-2xl bg-muted px-3.5">
                <Search size={16} color={colors.textMuted} />
                <TextInput
                  className="h-full flex-1 text-base text-foreground"
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('common.search')}
                  placeholderTextColor={colors.textMuted}
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
                <Text className="py-8 text-center text-sm text-muted-foreground">
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
          </View>
        </View>
      </Modal>
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
      className={`min-h-12 flex-row items-center gap-3 rounded-2xl px-3 ${
        active ? 'bg-primary/10' : ''
      }`}
      onPress={onPress}
    >
      <Text
        className={`flex-1 text-base ${active ? 'font-semibold text-primary' : 'text-foreground'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
      {active ? <Check size={18} color={colors.primary} /> : null}
    </Pressable>
  )
}
