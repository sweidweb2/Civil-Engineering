import {
  Camera,
  FolderOpen,
  ImageIcon,
  type LucideIcon,
  RefreshCw,
  Trash2,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { OptionSheet, type SheetOption } from '@/components/files/OptionSheet'
import type { PickSource } from '@/services/filePicker'

type PickSourceSheetProps = {
  visible: boolean
  title: string
  onClose: () => void
  onPick: (source: PickSource) => void
  /** Include document picker (camera + library always shown). */
  allowFile?: boolean
  /** When true, file option uses a "replace" icon/label feel. */
  hasExisting?: boolean
  /** Optional destructive remove row. */
  onRemove?: () => void
  removeLabel?: string
}

/** Camera / library / optional file / optional remove — shared by logo, gallery, stage uploads. */
export function PickSourceSheet({
  visible,
  title,
  onClose,
  onPick,
  allowFile = false,
  hasExisting = false,
  onRemove,
  removeLabel,
}: PickSourceSheetProps) {
  const { t } = useTranslation()

  const options: SheetOption[] = [
    {
      key: 'camera',
      icon: Camera,
      label: t('files.takePhoto'),
      onPress: () => onPick('camera'),
    },
    {
      key: 'library',
      icon: ImageIcon,
      label: t('files.chooseLibrary'),
      onPress: () => onPick('library'),
    },
  ]

  if (allowFile) {
    const FileIcon: LucideIcon = hasExisting ? RefreshCw : FolderOpen
    options.push({
      key: 'file',
      icon: FileIcon,
      label: t('files.chooseFile'),
      onPress: () => onPick('file'),
    })
  }

  if (onRemove) {
    options.push({
      key: 'remove',
      icon: Trash2,
      label: removeLabel ?? t('files.remove'),
      destructive: true,
      onPress: onRemove,
    })
  }

  return (
    <OptionSheet
      visible={visible}
      title={title}
      cancelLabel={t('common.cancel')}
      onClose={onClose}
      options={options}
    />
  )
}
