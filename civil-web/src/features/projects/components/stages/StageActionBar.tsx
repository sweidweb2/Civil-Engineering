import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

type StageActionBarProps = {
  nextLabel: string
  isSaving?: boolean
  isDirty?: boolean
  onDiscard: () => void
  onSaveDraft: () => void
  onSaveContinue: () => void
}

export function StageActionBar({
  nextLabel,
  isSaving,
  isDirty = false,
  onDiscard,
  onSaveDraft,
  onSaveContinue,
}: StageActionBarProps) {
  const { t } = useTranslation('projects')
  const noEdits = !isDirty || Boolean(isSaving)

  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-0 sm:rounded-b-xl">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" disabled={noEdits} onClick={onDiscard}>
          {t('stages.discard')}
        </Button>
        <Button type="button" variant="outline" disabled={noEdits} onClick={onSaveDraft}>
          {isSaving ? t('stages.saving') : t('stages.saveDraft')}
        </Button>
        <Button type="button" disabled={noEdits} onClick={onSaveContinue}>
          {isSaving ? t('stages.saving') : nextLabel}
        </Button>
      </div>
    </div>
  )
}
