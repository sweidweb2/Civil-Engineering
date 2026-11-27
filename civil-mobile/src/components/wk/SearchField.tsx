import type { ReactNode } from 'react'
import { TextInput, View } from 'react-native'
import { Plus, Search, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'

import { useWkPalette } from './palette'

/**
 * Shared search field used on portal photo grids (optional trailing + action).
 */
export function WkSearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  onSubmit,
  trailing,
  autoCapitalize = 'sentences',
}: {
  value: string
  onChangeText: (next: string) => void
  placeholder: string
  accessibilityLabel?: string
  onSubmit?: () => void
  /** Optional button beside the field (e.g. "new"). */
  trailing?: ReactNode
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}) {
  const { t } = useTranslation()
  const { c, shadow } = useWkPalette()

  return (
    <View className="flex-row gap-2.5">
      <View
        className="h-12 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-[14px] border border-wk-line bg-wk-sf ps-3.5"
        style={shadow}
      >
        <Search size={18} color={c.ink3} strokeWidth={1.9} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.ink3}
          accessibilityLabel={accessibilityLabel ?? placeholder}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize={autoCapitalize}
          onSubmitEditing={onSubmit}
          className="h-full min-w-0 flex-1 text-[15px] text-wk-ink"
        />
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.clearSearch')}
            onPress={() => onChangeText('')}
            className="size-11 items-center justify-center"
          >
            <X size={16} color={c.ink3} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      {trailing}
    </View>
  )
}

/** Dark square "+" control used next to `WkSearchField` on create-capable grids. */
export function WkSearchAddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useWkPalette()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="size-12 items-center justify-center rounded-[14px] bg-wk-ink active:opacity-80"
    >
      <Plus size={22} color={c.bg} strokeWidth={2} />
    </Pressable>
  )
}
