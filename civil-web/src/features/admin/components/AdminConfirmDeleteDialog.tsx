import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type AdminConfirmDeleteDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  confirmDisabled?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function AdminConfirmDeleteDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmDisabled = false,
  onOpenChange,
  onConfirm,
}: AdminConfirmDeleteDialogProps) {
  const { t } = useTranslation('common')
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={confirmDisabled} onClick={onConfirm}>
            {confirmLabel ?? t('remove')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
