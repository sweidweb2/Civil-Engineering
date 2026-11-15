import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FilePickError, type PickedFile, pickFile, type PickSource } from '@/services/filePicker'
import { useToastApiError } from '@/services/toast'

/**
 * Shared pick → optional upload busy flag → toast on FilePickError / other failures.
 * Callers own what happens with the picked file (upload, queue, etc.).
 */
export function useFilePick() {
  const { t } = useTranslation()
  const toastApiError = useToastApiError()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  async function pickAndRun(
    source: PickSource,
    onPicked: (file: PickedFile) => Promise<void> | void,
  ) {
    setSheetOpen(false)
    try {
      const picked = await pickFile(source, t)
      if (!picked) return
      setIsBusy(true)
      await onPicked(picked)
    } catch (error) {
      if (error instanceof FilePickError) toastApiError(new Error(t(`files.${error.code}`)))
      else toastApiError(error)
    } finally {
      setIsBusy(false)
    }
  }

  return {
    sheetOpen,
    setSheetOpen,
    isBusy,
    setIsBusy,
    pickAndRun,
    toastApiError,
  }
}
