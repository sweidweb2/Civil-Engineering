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

const DESTRUCTIVE_LABEL = /^(delete|remove|deactivate|archive|log out)/i

/**
 * Global in-app alert/confirm host. Mount once at the app root.
 * Confirms whose action label is destructive get a red icon and button.
 */
export function AppAlertHost() {
  const colors = useThemeColors()
  const current = useAlertStore((s) => s.current)
  const dismiss = useAlertStore((s) => s.dismiss)

  const isOpen = Boolean(current)
  const hasCancel = Boolean(current?.cancelLabel)
  const isDestructive = hasCancel && DESTRUCTIVE_LABEL.test(current?.confirmLabel ?? '')
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
          <View className="items-center gap-3">
            <View
              className={`size-14 items-center justify-center rounded-full ${
                isDestructive ? 'bg-destructive/10' : 'bg-primary/10'
              }`}
            >
              <Icon size={26} color={isDestructive ? colors.error : colors.primary} />
            </View>
            <Text className="text-center text-lg font-bold text-foreground">{current?.title}</Text>
            <Text className="text-center text-sm leading-5 text-muted-foreground">
              {current?.message}
            </Text>
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
