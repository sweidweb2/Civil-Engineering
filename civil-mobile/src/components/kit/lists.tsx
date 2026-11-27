import { Text, View } from 'react-native'
import { type LucideIcon, SearchX } from 'lucide-react-native'

import { Button, ButtonText } from '@/components/ui/button'
import { useThemeColors } from '@/hooks/useThemeColors'
import { sizes } from '@/theme/sizes'
import { TYPE } from '@/theme/typography'

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

/**
 * Empty state: left-aligned in the content's place. Line icon, a sentence on
 * what will appear here, how to get there, optional action.
 */
export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colors = useThemeColors()
  return (
    <View className="items-start gap-2 py-6">
      <Icon size={sizes.icon} color={colors.muted} strokeWidth={sizes.iconStroke} />
      <Text className={`${TYPE.bodyStrong} text-foreground`}>{title}</Text>
      {description ? (
        <Text className={`${TYPE.bodySm} text-muted-foreground`}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outline" className="mt-2 self-stretch" onPress={onAction}>
          <ButtonText>{actionLabel}</ButtonText>
        </Button>
      ) : null}
    </View>
  )
}
