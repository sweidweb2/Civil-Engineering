import { Text, View } from 'react-native'
import { CircleAlert, Info } from 'lucide-react-native'

import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import { Button, ButtonText } from '@/components/ui/button'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useAlertStore } from '@/stores/alertStore'
import { sizes } from '@/theme/sizes'
import { TYPE } from '@/theme/typography'

const DESTRUCTIVE_LABEL = /^(delete|remove|deactivate|archive|log out)/i

/**
 * Global in-app alert/confirm host. Mount once at the app root.
 * Confirms whose action label is destructive get a negative icon and label.
 */
export function AppAlertHost() {
  const colors = useThemeColors()
  const current = useAlertStore((s) => s.current)
  const dismiss = useAlertStore((s) => s.dismiss)

  const isOpen = Boolean(current)
  const hasCancel = Boolean(current?.cancelLabel)
  const isDestructive =
    current?.destructive ?? (hasCancel && DESTRUCTIVE_LABEL.test(current?.confirmLabel ?? ''))
  const Icon = isDestructive ? CircleAlert : Info

  function closeWith(action?: () => void) {
    dismiss()
    action?.()
  }

  return (
    <AlertDialog isOpen={isOpen} onClose={() => closeWith(current?.onCancel)} size="sm">
      <AlertDialogBackdrop />
      <AlertDialogContent>
        <AlertDialogBody>
          <View className="items-start gap-2">
            <Icon
              size={sizes.icon}
              color={isDestructive ? colors.negative : colors.muted}
              strokeWidth={sizes.iconStroke}
            />
            <Text className={`${TYPE.title} text-foreground`}>{current?.title}</Text>
            <Text className={`${TYPE.bodySm} text-muted-foreground`}>{current?.message}</Text>
          </View>
        </AlertDialogBody>
        <AlertDialogFooter className="mt-6">
          {hasCancel ? (
            <Button
              className="flex-1"
              variant="outline"
              onPress={() => closeWith(current?.onCancel)}
            >
              <ButtonText>{current?.cancelLabel ?? 'Cancel'}</ButtonText>
            </Button>
          ) : null}
          <Button
            className="flex-1"
            variant={isDestructive ? 'destructive' : 'default'}
            onPress={() => closeWith(current?.onConfirm)}
          >
            <ButtonText>{current?.confirmLabel ?? 'OK'}</ButtonText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
