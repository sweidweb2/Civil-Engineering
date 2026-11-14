import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { type ProjectStagesSummary, STAGE_KEYS, type StageKey } from '@/services/project-stages'

type ProjectStagesHeaderProps = {
  summary: ProjectStagesSummary
  activeStep: StageKey
}

export function ProjectStagesHeader({ summary, activeStep }: ProjectStagesHeaderProps) {
  const { t } = useTranslation('projects')
  const done = STAGE_KEYS.filter((key) => summary[key].isComplete).length

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium">{t('stages.overallProgress')}</span>
          <span className="text-muted-foreground">
            {t('stages.stagesCompleteCount', { done, total: STAGE_KEYS.length })}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {STAGE_KEYS.map((key) => {
            const slot = summary[key]
            return (
              <div
                key={key}
                className={cn(
                  'h-2 rounded-full',
                  slot.isComplete && 'bg-teal-600',
                  !slot.isComplete && slot.exists && 'bg-amber-500',
                  !slot.isComplete && !slot.exists && key === activeStep && 'bg-amber-500',
                  !slot.isComplete && !slot.exists && key !== activeStep && 'bg-muted',
                )}
              />
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('stages.activeStageHint', { name: t(`stages.names.${activeStep}`) })}
        </p>
      </div>
    </div>
  )
}
