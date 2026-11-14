import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import type { ProjectStageStatus } from '@/services/project-stages'

const OPTIONS: Array<{
  value: Exclude<ProjectStageStatus, 'ON_HOLD'>
  dot: string
}> = [
  { value: 'NOT_STARTED', dot: 'bg-slate-400' },
  { value: 'IN_PROGRESS', dot: 'bg-amber-500' },
  { value: 'COMPLETED', dot: 'bg-teal-500' },
]

type StageStatusToggleProps = {
  value: ProjectStageStatus
  onChange: (value: ProjectStageStatus) => void
  disabled?: boolean
}

export function StageStatusToggle({ value, onChange, disabled }: StageStatusToggleProps) {
  const { t } = useTranslation('projects')
  const current = value === 'ON_HOLD' ? 'IN_PROGRESS' : value

  return (
    <div
      className="inline-flex flex-wrap items-center gap-1 rounded-full border bg-muted/40 p-1"
      role="radiogroup"
      aria-label={t('stages.status')}
    >
      {OPTIONS.map((option) => {
        const selected = current === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors',
              selected
                ? 'bg-background font-medium text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className={cn('size-2.5 rounded-full', option.dot)} aria-hidden />
            {t(`stages.statusValues.${option.value}`)}
          </button>
        )
      })}
    </div>
  )
}
