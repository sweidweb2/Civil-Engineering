import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { ChecklistItem } from '@/features/projects/lib/stage-completeness'
import { cn } from '@/lib/utils'
import type { ProjectStageStatus, StageKey } from '@/services/project-stages'

import { StageActionBar } from './StageActionBar'
import { StageChecklist } from './StageChecklist'
import { StageStatusToggle } from './StageStatusToggle'

type StageBodyShellProps = {
  stageKey: StageKey
  stepIndex: number
  totalSteps: number
  status: ProjectStageStatus
  onStatusChange: (status: ProjectStageStatus) => void
  missingCount: number
  checklist: ChecklistItem[]
  sidebarFiles: ReactNode
  nextStageLabel: string
  isSaving?: boolean
  isDirty?: boolean
  onDiscard: () => void
  onSaveDraft: () => void
  onSaveContinue: () => void
  children: ReactNode
}

export function StageBodyShell({
  stageKey,
  stepIndex,
  totalSteps,
  status,
  onStatusChange,
  missingCount,
  checklist,
  sidebarFiles,
  nextStageLabel,
  isSaving,
  isDirty,
  onDiscard,
  onSaveDraft,
  onSaveContinue,
  children,
}: StageBodyShellProps) {
  const { t } = useTranslation('projects')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('stages.stageOf', { current: stepIndex + 1, total: totalSteps })}
          </p>
          <h3 className="text-xl font-semibold tracking-tight">{t(`stages.names.${stageKey}`)}</h3>
        </div>
        {missingCount > 0 ? (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            {t('stages.requiredMissing', { count: missingCount })}
          </span>
        ) : (
          <span className="rounded-full bg-teal-500/15 px-3 py-1 text-xs font-medium text-teal-700 dark:text-teal-400">
            {t('stages.complete')}
          </span>
        )}
      </div>

      <StageStatusToggle value={status} onChange={onStatusChange} disabled={isSaving} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">{children}</div>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          {sidebarFiles}
          <StageChecklist items={checklist} />
        </aside>
      </div>

      <StageActionBar
        nextLabel={
          stepIndex >= totalSteps - 1
            ? t('stages.saveFinish')
            : t('stages.saveContinue', { name: nextStageLabel })
        }
        isSaving={isSaving}
        isDirty={isDirty}
        onDiscard={onDiscard}
        onSaveDraft={onSaveDraft}
        onSaveContinue={onSaveContinue}
      />
    </div>
  )
}

export function stageToneClass(kind: 'idle' | 'progress' | 'done') {
  return cn(
    kind === 'idle' && 'border-slate-300 bg-slate-100 text-slate-500',
    kind === 'progress' && 'border-amber-500 bg-amber-500 text-white',
    kind === 'done' && 'border-teal-600 bg-teal-600 text-white',
  )
}
