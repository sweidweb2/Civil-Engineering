import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { ContentSkeleton } from '@/components/feedback/skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import { deleteFile, getDownloadUrl, uploadFile } from '@/services/files'
import {
  addProjectStepInput,
  deleteProjectStepInput,
  fileIdFromValue,
  getProjectStepper,
  listingIdFromValue,
  listProjectSteppers,
  type ProjectStepDetail,
  type ProjectStepNode,
  saveProjectStepperValues,
} from '@/services/project-steppers'

import { useStepperDraft } from '../hooks/useStepperDraft'
import { draftValueForInput, patchNode } from '../lib/stepper-values'
import { AddStepperInputDialog, type AddStepperInputValues } from './AddStepperInputDialog'
import { StepperInputCard } from './StepperInputCard'
import { StepperNodeList } from './StepperNodeList'

type ProjectSteppersSectionProps = {
  projectId: string
}

export function ProjectSteppersSection({ projectId }: ProjectSteppersSectionProps) {
  const { t } = useTranslation(['projects', 'common'])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [busyInputId, setBusyInputId] = useState<string | null>(null)

  const loadNodes = useCallback(() => listProjectSteppers(projectId), [projectId])
  const nodesRemote = useRemoteData(loadNodes, { queryKey: ['project-steppers', projectId] })
  const nodesData = nodesRemote.status === 'success' ? nodesRemote.data.data : null
  const nodes = useMemo<ProjectStepNode[]>(() => nodesData ?? [], [nodesData])

  useEffect(() => {
    if (nodes.length === 0) {
      setSelectedId(null)
      return
    }
    setSelectedId((current) => {
      if (current && nodes.some((node) => node.id === current)) return current
      return nodes.find((node) => !node.isComplete)?.id ?? nodes[0]?.id ?? null
    })
  }, [nodes])

  const completedCount = nodes.filter((node) => node.isComplete).length

  const loadDetail = useCallback(async () => {
    if (!selectedId) return { data: null as ProjectStepDetail | null }
    return getProjectStepper(projectId, selectedId)
  }, [projectId, selectedId])

  const detailRemote = useRemoteData(loadDetail, {
    queryKey: ['project-stepper-detail', projectId, selectedId ?? 'none'],
    enabled: Boolean(selectedId),
  })
  const detail = detailRemote.status === 'success' ? detailRemote.data.data : null

  const { draft, setValue, removeValue, syncFromDetail } = useStepperDraft(detail)

  function applyDetail(next: ProjectStepDetail) {
    detailRemote.mutate(() => ({ data: next }))
    nodesRemote.mutate((current) => ({
      ...current,
      data: patchNode(current.data, next.id, next.inputs),
    }))
  }

  async function save() {
    if (!selectedId || !detail) return
    setIsSaving(true)
    try {
      const result = await saveProjectStepperValues(
        projectId,
        selectedId,
        detail.inputs.map((input) => {
          const raw = draft[input.id] ?? null
          const code = input.inputTypeCode.toUpperCase()
          if (code === 'CATEGORY') {
            return { id: input.id, value: listingIdFromValue(raw) }
          }
          if (code === 'FILE') {
            return { id: input.id, value: fileIdFromValue(raw) }
          }
          return { id: input.id, value: raw }
        }),
      )
      toast.success(t('projects:valuesSaved'))
      applyDetail(result.data)
      syncFromDetail(result.data)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('projects:couldNotSaveValues'))
    } finally {
      setIsSaving(false)
    }
  }

  async function addInput(values: AddStepperInputValues): Promise<boolean> {
    if (!selectedId || !detail) return false
    setIsAdding(true)
    try {
      const result = await addProjectStepInput(projectId, selectedId, values)
      if (result.meta?.orderAdjusted) {
        toast.message(t('projects:orderAdjusted', { order: result.meta.orderNb }))
      }
      toast.message(t('projects:inputAdded'))
      setAddOpen(false)
      const nextInputs = [...detail.inputs, result.data].sort(
        (a, b) => a.orderNb - b.orderNb || a.label.localeCompare(b.label),
      )
      applyDetail({ ...detail, inputs: nextInputs })
      setValue(result.data.id, draftValueForInput(result.data))
      return true
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('projects:couldNotAddInput'))
      return false
    } finally {
      setIsAdding(false)
    }
  }

  async function onStepperFileSelected(inputId: string, file: File | undefined) {
    if (!file || !selectedId) return
    setBusyInputId(inputId)
    let uploadedId: string | null = null
    try {
      const uploaded = await uploadFile({
        file,
        entityType: 'PROJECT',
        entityId: projectId,
      })
      uploadedId = uploaded.id
      const result = await saveProjectStepperValues(projectId, selectedId, [
        { id: inputId, value: uploaded.id },
      ])
      applyDetail(result.data)
      const saved = result.data.inputs.find((input) => input.id === inputId)
      setValue(inputId, saved ? draftValueForInput(saved) : null)
      toast.success(t('projects:fileSaved'))
    } catch (error) {
      if (uploadedId) {
        void deleteFile(uploadedId).catch(() => undefined)
      }
      toast.error(error instanceof ApiError ? error.message : t('projects:couldNotUploadFile'))
    } finally {
      setBusyInputId(null)
    }
  }

  async function clearStepperFile(inputId: string) {
    if (!selectedId) return
    setBusyInputId(inputId)
    try {
      const result = await saveProjectStepperValues(projectId, selectedId, [
        { id: inputId, value: null },
      ])
      applyDetail(result.data)
      setValue(inputId, null)
      toast.message(t('projects:fileCleared'))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('projects:couldNotClearFile'))
    } finally {
      setBusyInputId(null)
    }
  }

  async function openStepperFile(fileId: string) {
    try {
      const result = await getDownloadUrl(fileId)
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('projects:couldNotOpenFile'))
    }
  }

  async function removeInput(inputId: string) {
    if (!selectedId || !detail) return
    setBusyInputId(inputId)
    try {
      await deleteProjectStepInput(projectId, selectedId, inputId)
      toast.message(t('projects:inputRemoved'))
      const nextInputs = detail.inputs.filter((input) => input.id !== inputId)
      applyDetail({ ...detail, inputs: nextInputs })
      removeValue(inputId)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('projects:couldNotRemoveInput'))
    } finally {
      setBusyInputId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('projects:steppers')}</CardTitle>
        <CardDescription>{t('projects:steppersDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AsyncState
          isLoading={nodesRemote.isLoading}
          error={nodesRemote.isError ? nodesRemote.error : undefined}
          onRetry={() => void nodesRemote.refetch()}
          loadingFallback={<ContentSkeleton />}
        >
          {nodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('projects:noSteppers')}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {t('projects:progressComplete', {
                    done: completedCount,
                    total: nodes.length,
                  })}
                </span>
                <span>{t('projects:clickNode')}</span>
              </div>

              <StepperNodeList nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} />

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <AsyncState
                  isLoading={detailRemote.isLoading}
                  error={detailRemote.isError ? detailRemote.error : undefined}
                  onRetry={() => void detailRemote.refetch()}
                  loadingFallback={<ContentSkeleton />}
                >
                  {detail ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">{detail.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {t('projects:fillFields')}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setAddOpen(true)}
                          >
                            <Plus />
                            {t('projects:addInput')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void save()}
                            disabled={isSaving || detail.inputs.length === 0}
                          >
                            <Save />
                            {isSaving ? t('projects:savingValues') : t('projects:saveValues')}
                          </Button>
                        </div>
                      </div>

                      {detail.inputs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No inputs on this stepper yet. Add a project-only field above.
                        </p>
                      ) : (
                        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {detail.inputs.map((input) => (
                            <StepperInputCard
                              key={input.id}
                              input={input}
                              value={draft[input.id] ?? null}
                              isBusy={busyInputId === input.id}
                              isRemoving={busyInputId === input.id}
                              onChange={(next) => setValue(input.id, next)}
                              onFileSelected={(file) => void onStepperFileSelected(input.id, file)}
                              onClearFile={() => void clearStepperFile(input.id)}
                              onOpenFile={(fileId) => void openStepperFile(fileId)}
                              onRemove={() => void removeInput(input.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </AsyncState>
              </div>
            </>
          )}
        </AsyncState>
      </CardContent>

      <AddStepperInputDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        isAdding={isAdding}
        onSubmit={addInput}
      />
    </Card>
  )
}
