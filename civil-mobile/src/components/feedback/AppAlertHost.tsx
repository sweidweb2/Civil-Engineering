import { Text } from 'react-native'

import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog'
import { Button, ButtonText } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { useAlertStore } from '@/stores/alertStore'

/**
 * Global in-app alert/confirm host. Mount once at the app root.
 */
export function AppAlertHost() {
  const current = useAlertStore((s) => s.current)
  const dismiss = useAlertStore((s) => s.dismiss)

  const isOpen = Boolean(current)
  const hasCancel = Boolean(current?.cancelLabel)

  function closeWith(action?: () => void) {
    dismiss()
    action?.()
  }

  return (
    <AlertDialog isOpen={isOpen} onClose={() => closeWith(current?.onCancel)} size="sm">
      <AlertDialogBackdrop />
      <AlertDialogContent>
        <AlertDialogHeader>
          <Heading size="md" className="text-foreground">
            {current?.title}
          </Heading>
        </AlertDialogHeader>
        <AlertDialogBody className="mt-3 mb-6">
          <Text className="text-sm text-muted-foreground">{current?.message}</Text>
        </AlertDialogBody>
        <AlertDialogFooter>
          {hasCancel ? (
            <Button variant="outline" size="sm" onPress={() => closeWith(current?.onCancel)}>
              <ButtonText>{current?.cancelLabel ?? 'Cancel'}</ButtonText>
            </Button>
          ) : null}
          <Button size="sm" onPress={() => closeWith(current?.onConfirm)}>
            <ButtonText>{current?.confirmLabel ?? 'OK'}</ButtonText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
