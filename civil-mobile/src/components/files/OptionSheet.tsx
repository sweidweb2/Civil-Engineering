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
      <View className="gap-3 pb-2">
        {options.map(({ key, icon: Icon, label, onPress, destructive }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            className="h-16 flex-row items-center gap-4 rounded-2xl bg-muted px-4 active:opacity-70"
            onPress={onPress}
          >
            <View
              className={`size-10 items-center justify-center rounded-xl ${
                destructive ? 'bg-destructive/10' : 'bg-primary/10'
              }`}
            >
              <Icon size={20} color={destructive ? colors.error : colors.primary} />
            </View>
            <Text
              className={`flex-1 text-base font-semibold ${
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
