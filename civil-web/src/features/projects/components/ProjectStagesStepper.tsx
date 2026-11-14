import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailCardSkeleton } from '@/components/feedback/skeletons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useRemoteData } from '@/hooks/useRemoteData'
import { getProjectStagesSummary, STAGE_KEYS, type StageKey } from '@/services/project-stages'

import { DesignForm } from './stages/DesignForm'
import { GeotechnicalForm } from './stages/GeotechnicalForm'
import { LicensingForm } from './stages/LicensingForm'
import { MaintenanceForm } from './stages/MaintenanceForm'
import { MaterialsForm } from './stages/MaterialsForm'

type ProjectStagesStepperProps = {
  projectId: string
}

export function ProjectStagesStepper({ projectId }: ProjectStagesStepperProps) {
  const { t } = useTranslation('projects')
  const [activeStep, setActiveStep] = useState<StageKey>('geotechnical')

  const load = useCallback(() => getProjectStagesSummary(projectId), [projectId])
  const remote = useRemoteData(load, { queryKey: ['projects', 'stages', projectId] })
  const summary = remote.status === 'success' ? remote.data.data : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('stages.title')}</CardTitle>
        <CardDescription>{t('stages.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AsyncState
          isLoading={remote.isLoading}
          error={remote.isError ? remote.error : undefined}
          onRetry={() => void remote.refetch()}
          loadingFallback={<DetailCardSkeleton />}
        >
          {summary ? (
            <>
              <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {STAGE_KEYS.map((key, index) => {
                  const slot = summary[key]
                  const isActive = activeStep === key
                  const incomplete = !slot.isComplete
                  return (
                    <li key={key} className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setActiveStep(key)}
                        className={cn(
                          'flex w-full flex-col gap-1 rounded-md border-2 px-3 py-3 text-start transition-colors',
                          isActive ? 'bg-muted/40' : 'bg-background',
                          incomplete
                            ? 'border-red-500 hover:border-red-600'
                            : 'border-emerald-600/70 hover:border-emerald-700',
                        )}
                      >
                        <span className="text-xs text-muted-foreground">
                          {t('stages.stepNumber', { number: index + 1 })}
                        </span>
                        <span className="text-sm font-medium leading-snug">
                          {t(`stages.names.${key}`)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {incomplete ? t('stages.incomplete') : t('stages.complete')}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>

              <div className="rounded-md border p-4">
                <h3 className="mb-4 text-base font-semibold">{t(`stages.names.${activeStep}`)}</h3>
                {activeStep === 'geotechnical' ? (
                  <GeotechnicalForm
                    key={`geo-${summary.geotechnical.data?.updatedAt ?? 'new'}`}
                    projectId={projectId}
                    initial={summary.geotechnical.data}
                    onSaved={() => void remote.refetch()}
                  />
                ) : null}
                {activeStep === 'design' ? (
                  <DesignForm
                    key={`design-${summary.design.data?.updatedAt ?? 'new'}`}
                    projectId={projectId}
                    initial={summary.design.data}
                    onSaved={() => void remote.refetch()}
                  />
                ) : null}
                {activeStep === 'licensing' ? (
                  <LicensingForm
                    key={`lic-${summary.licensing.data?.updatedAt ?? 'new'}`}
                    projectId={projectId}
                    initial={summary.licensing.data}
                    onSaved={() => void remote.refetch()}
                  />
                ) : null}
                {activeStep === 'materials' ? (
                  <MaterialsForm
                    key={`mat-${summary.materials.data?.updatedAt ?? 'new'}`}
                    projectId={projectId}
                    initial={summary.materials.data}
                    onSaved={() => void remote.refetch()}
                  />
                ) : null}
                {activeStep === 'maintenance' ? (
                  <MaintenanceForm
                    key={`maint-${summary.maintenance.data?.updatedAt ?? 'new'}`}
                    projectId={projectId}
                    initial={summary.maintenance.data}
                    onSaved={() => void remote.refetch()}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </AsyncState>
      </CardContent>
    </Card>
  )
}
