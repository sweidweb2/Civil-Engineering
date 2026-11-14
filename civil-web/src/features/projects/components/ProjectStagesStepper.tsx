import { useCallback, useState } from 'react'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailCardSkeleton } from '@/components/feedback/skeletons'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import type { Project } from '@/services/projects'
import { getProjectStagesSummary, STAGE_KEYS, type StageKey } from '@/services/project-stages'

import { DesignForm } from './stages/DesignForm'
import { GeotechnicalForm } from './stages/GeotechnicalForm'
import { LicensingForm } from './stages/LicensingForm'
import { MaintenanceForm } from './stages/MaintenanceForm'
import { MaterialsForm } from './stages/MaterialsForm'
import { ProjectStagesHeader } from './stages/ProjectStagesHeader'

type ProjectStagesStepperProps = {
  project: Project
}

function stepTone(slot: { exists: boolean; isComplete: boolean; missingCount: number }) {
  if (slot.isComplete) return 'done' as const
  if (slot.exists || slot.missingCount > 0) return 'progress' as const
  return 'idle' as const
}

export function ProjectStagesStepper({ project }: ProjectStagesStepperProps) {
  const { t } = useTranslation('projects')
  const [activeStep, setActiveStep] = useState<StageKey>('geotechnical')

  const load = useCallback(() => getProjectStagesSummary(project.id), [project.id])
  const remote = useRemoteData(load, { queryKey: ['projects', 'stages', project.id] })
  const summary = remote.status === 'success' ? remote.data.data : null

  const goNext = () => {
    const index = STAGE_KEYS.indexOf(activeStep)
    if (index < STAGE_KEYS.length - 1) setActiveStep(STAGE_KEYS[index + 1]!)
  }

  return (
    <div className="space-y-6">
      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailCardSkeleton />}
      >
        {summary ? (
          <>
            <ProjectStagesHeader summary={summary} activeStep={activeStep} />

            <ol className="flex w-full items-start gap-0 overflow-x-auto pb-2">
              {STAGE_KEYS.map((key, index) => {
                const slot = summary[key]
                const tone = stepTone(slot)
                const isActive = activeStep === key
                const isLast = index === STAGE_KEYS.length - 1
                const activeIndex = STAGE_KEYS.indexOf(activeStep)
                const lineFilled = activeIndex > index

                return (
                  <li
                    key={key}
                    className={cn(
                      'flex min-w-[7.5rem] items-start sm:min-w-0',
                      isLast ? 'shrink-0' : 'flex-1',
                    )}
                  >
                    <div className="flex w-[4.75rem] shrink-0 flex-col items-center gap-2 sm:w-24">
                      <button
                        type="button"
                        aria-current={isActive ? 'step' : undefined}
                        onClick={() => setActiveStep(key)}
                        className={cn(
                          'flex size-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-shadow sm:size-11',
                          tone === 'idle' && 'border-slate-300 bg-slate-100 text-slate-500',
                          tone === 'progress' && 'border-amber-500 bg-amber-500 text-white',
                          tone === 'done' && 'border-teal-600 bg-teal-600 text-white',
                          isActive && 'ring-2 ring-offset-2 ring-offset-background',
                          isActive && tone === 'idle' && 'ring-slate-300',
                          isActive && tone === 'progress' && 'ring-amber-400/60',
                          isActive && tone === 'done' && 'ring-teal-500/50',
                        )}
                      >
                        {tone === 'done' ? <Check className="size-4" aria-hidden /> : index + 1}
                      </button>
                      <div className="w-full text-center">
                        <p
                          className={cn(
                            'text-[11px] leading-snug sm:text-xs',
                            isActive
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-muted-foreground',
                          )}
                        >
                          {t(`stages.names.${key}`)}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 text-[10px] sm:text-[11px]',
                            tone === 'idle' && 'text-muted-foreground',
                            tone === 'progress' && 'text-amber-600',
                            tone === 'done' && 'text-teal-700',
                          )}
                        >
                          {tone === 'done'
                            ? t('stages.complete')
                            : tone === 'progress'
                              ? slot.missingCount > 0
                                ? t('stages.inProgressMissing', { count: slot.missingCount })
                                : t('stages.statusValues.IN_PROGRESS')
                              : t('stages.notStarted')}
                        </p>
                      </div>
                    </div>

                    {!isLast ? (
                      <div
                        className="mt-5 flex min-w-4 flex-1 items-center px-1 sm:mt-5"
                        aria-hidden
                      >
                        <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="absolute inset-y-0 start-0 rounded-full bg-teal-600 transition-[width] duration-300"
                            style={{ width: lineFilled ? '100%' : '0%' }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ol>

            <div className="min-h-[min(36rem,calc(100svh-18rem))] rounded-xl border bg-card p-4 sm:p-5">
              {activeStep === 'geotechnical' ? (
                <GeotechnicalForm
                  key={`geo-${summary.geotechnical.data?.updatedAt ?? 'new'}`}
                  projectId={project.id}
                  initial={summary.geotechnical.data}
                  stepIndex={0}
                  onSaved={() => void remote.refetch()}
                  onContinue={() => {
                    void remote.refetch()
                    goNext()
                  }}
                />
              ) : null}
              {activeStep === 'design' ? (
                <DesignForm
                  key={`design-${summary.design.data?.updatedAt ?? 'new'}`}
                  projectId={project.id}
                  initial={summary.design.data}
                  stepIndex={1}
                  onSaved={() => void remote.refetch()}
                  onContinue={() => {
                    void remote.refetch()
                    goNext()
                  }}
                />
              ) : null}
              {activeStep === 'licensing' ? (
                <LicensingForm
                  key={`lic-${summary.licensing.data?.updatedAt ?? 'new'}`}
                  projectId={project.id}
                  initial={summary.licensing.data}
                  stepIndex={2}
                  onSaved={() => void remote.refetch()}
                  onContinue={() => {
                    void remote.refetch()
                    goNext()
                  }}
                />
              ) : null}
              {activeStep === 'materials' ? (
                <MaterialsForm
                  key={`mat-${summary.materials.data?.updatedAt ?? 'new'}`}
                  projectId={project.id}
                  initial={summary.materials.data}
                  stepIndex={3}
                  onSaved={() => void remote.refetch()}
                  onContinue={() => {
                    void remote.refetch()
                    goNext()
                  }}
                />
              ) : null}
              {activeStep === 'maintenance' ? (
                <MaintenanceForm
                  key={`maint-${summary.maintenance.data?.updatedAt ?? 'new'}`}
                  projectId={project.id}
                  initial={summary.maintenance.data}
                  stepIndex={4}
                  onSaved={() => void remote.refetch()}
                  onContinue={() => void remote.refetch()}
                />
              ) : null}
            </div>
          </>
        ) : null}
      </AsyncState>
    </div>
  )
}
