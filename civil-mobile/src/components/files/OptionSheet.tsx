import { Text, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'

import { BottomSheet } from '@/components/kit/sheet'
import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'

export type SheetOption = {
  key: string
  icon: LucideIcon
  label: string
  onPress: () => void
  destructive?: boolean
}

/** Bottom sheet listing a few tappable options (photo source, image actions…). */
export function OptionSheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean
  title: string
  options: SheetOption[]
  /** Kept for call-site compatibility; the sheet's close button and backdrop use i18n. */
  cancelLabel?: string
  onClose: () => void
}) {
  const colors = useThemeColors()
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View className="mb-2 overflow-hidden rounded-lg border border-border bg-card">
        {options.map(({ key, icon: Icon, label, onPress, destructive }, index) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            className={`min-h-[56px] flex-row items-center gap-3 px-4 active:bg-background ${
              index < options.length - 1 ? 'border-b border-line-subtle' : ''
            }`}
            onPress={onPress}
          >
            <Icon
              size={20}
              color={destructive ? colors.negative : colors.ink2}
              strokeWidth={1.75}
            />
            <Text
              className={`flex-1 text-base font-medium ${
                destructive ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  )
}
