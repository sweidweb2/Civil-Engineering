import { Modal, Text, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
  cancelLabel,
  onClose,
}: {
  visible: boolean
  title: string
  options: SheetOption[]
  cancelLabel: string
  onClose: () => void
}) {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel={cancelLabel}
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
      >
        <Pressable
          className="gap-3 rounded-t-[32px] bg-background px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          <View className="mb-1 h-1.5 w-10 self-center rounded-full bg-border" />
          <Text className="pb-1 text-lg font-bold text-foreground">{title}</Text>
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
        </Pressable>
      </Pressable>
    </Modal>
  )
}
