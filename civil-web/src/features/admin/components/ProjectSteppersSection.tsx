import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from 'cn'
import { Check, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { ContentSkeleton } from '@/components/feedback/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import {
  INPUT_TYPES_PICKER_QUERY_KEY,
  type InputType,
  listInputTypesForPicker,
} from '@/services/input-types'
import {
  addProjectStepInput,
  deleteProjectStepInput,
  getProjectStepper,
  listProjectSteppers,
  type ProjectStepDetail,
  type ProjectStepInputField,
  type ProjectStepNode,
  saveProjectStepperValues,
  type StepperValue,
} from '@/services/project-steppers'

type ProjectSteppersSectionProps = {
  projectId: string
}

type NodePhase = 'done' | 'current' | 'upcoming'

function resolveNodePhase(nodes: ProjectStepNode[], nodeId: string): NodePhase {
  const firstOpenIndex = nodes.findIndex((node) => !node.isComplete)
  const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
  if (nodeIndex < 0) return 'upcoming'
  if (nodes[nodeIndex]?.isComplete) return 'done'
  if (firstOpenIndex < 0 || nodeIndex === firstOpenIndex) return 'current'
  if (nodeIndex < firstOpenIndex) return 'done'
  return 'upcoming'
}

/** Parse YYYY-MM-DD as a local calendar date (avoid UTC off-by-one). */
function toDate(value: StepperValue): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatDateValue(date: Date | undefined): string | null {
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isFilledValue(value: StepperValue): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

function nodeStatsFromInputs(inputs: ProjectStepInputField[]) {
  const inputCount = inputs.length
  const filledCount = inputs.filter((input) => isFilledValue(input.value)).length
  return {
    inputCount,
    filledCount,
    isComplete: filledCount === inputCount,
  }
}

function patchNode(
  nodes: ProjectStepNode[],
  projectStepId: string,
  inputs: ProjectStepInputField[],
): ProjectStepNode[] {
  const stats = nodeStatsFromInputs(inputs)
  return nodes.map((node) => (node.id === projectStepId ? { ...node, ...stats } : node))
}

export function ProjectSteppersSection({ projectId }: ProjectSteppersSectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, StepperValue>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addLabel, setAddLabel] = useState('')
  const [addTypeId, setAddTypeId] = useState('')
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
  const detail =
    detailRemote.status === 'success' ? detailRemote.data.data : null

  useEffect(() => {
    if (!detail) {
      setDraft({})
      return
    }
    const next: Record<string, StepperValue> = {}
    for (const input of detail.inputs) {
      next[input.id] = input.value
    }
    setDraft(next)
  }, [detail])

  const loadPickerTypes = useCallback(() => listInputTypesForPicker(), [])
  const typesRemote = useRemoteData(loadPickerTypes, {
    queryKey: [...INPUT_TYPES_PICKER_QUERY_KEY],
    enabled: addOpen,
  })
  const typesData = typesRemote.status === 'success' ? typesRemote.data.data : null
  const types = useMemo<InputType[]>(() => typesData ?? [], [typesData])

  useEffect(() => {
    if (!addOpen || types.length === 0) return
    setAddTypeId((current) => current || types[0]?.id || '')
  }, [addOpen, types])

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
        detail.inputs.map((input) => ({
          id: input.id,
          value: draft[input.id] ?? null,
        })),
      )
      toast.success('Stepper values saved')
      applyDetail(result.data)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save values')
    } finally {
      setIsSaving(false)
    }
  }

  async function addInput() {
    if (!selectedId || !detail) return
    const label = addLabel.trim()
    if (!label) {
      toast.error('Label is required')
      return
    }
    if (!addTypeId) {
      toast.error('Input type is required')
      return
    }
    setIsAdding(true)
    try {
      const result = await addProjectStepInput(projectId, selectedId, {
        label,
        inputTypeId: addTypeId,
      })
      if (result.meta?.orderAdjusted) {
        toast.message(`Order set to ${result.meta.orderNb} (next available slot).`)
      }
      toast.message('Project input added')
      setAddOpen(false)
      setAddLabel('')
      const nextInputs = [...detail.inputs, result.data].sort(
        (a, b) => a.orderNb - b.orderNb || a.label.localeCompare(b.label),
      )
      applyDetail({ ...detail, inputs: nextInputs })
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not add input')
    } finally {
      setIsAdding(false)
    }
  }

  async function removeInput(inputId: string) {
    if (!selectedId || !detail) return
    setBusyInputId(inputId)
    try {
      await deleteProjectStepInput(projectId, selectedId, inputId)
      toast.message('Input removed from this project step')
      const nextInputs = detail.inputs.filter((input) => input.id !== inputId)
      applyDetail({ ...detail, inputs: nextInputs })
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove input')
    } finally {
      setBusyInputId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Steppers</CardTitle>
        <CardDescription>
          Project workflow as connected nodes. Done steps fill in; the current open step is
          highlighted. Select any node to edit its fields.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AsyncState
          isLoading={nodesRemote.isLoading}
          error={nodesRemote.isError ? nodesRemote.error : undefined}
          onRetry={() => void nodesRemote.refetch()}
          loadingFallback={<ContentSkeleton />}
        >
          {nodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No steppers were assigned to this project. Add active steps before creating new
              projects.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Progress{' '}
                  <span className="font-medium text-foreground tabular-nums">
                    {completedCount}/{nodes.length}
                  </span>{' '}
                  complete
                </span>
                <span>Click a node to open its fields</span>
              </div>

              <div className="overflow-x-auto pb-2 pt-2">
                <ol className="flex min-w-max">
                  {nodes.map((node, index) => {
                    const phase = resolveNodePhase(nodes, node.id)
                    const isSelected = node.id === selectedId
                    const selectedIndex = selectedId
                      ? nodes.findIndex((item) => item.id === selectedId)
                      : -1
                    // Line after this node fills when step is done or user moved past it.
                    const lineFilled =
                      index < nodes.length - 1 &&
                      (node.isComplete || (selectedIndex >= 0 && selectedIndex > index))

                    return (
                      <li
                        key={node.id}
                        className="relative flex w-[7.5rem] shrink-0 flex-col items-center"
                      >
                        {index < nodes.length - 1 ? (
                          <div
                            aria-hidden
                            className="pointer-events-none absolute top-5 left-1/2 z-0 h-0.5 w-full overflow-hidden rounded-full bg-border"
                          >
                            <div
                              className={cn(
                                'h-full origin-left rounded-full bg-primary transition-transform duration-500 ease-out',
                                lineFilled ? 'scale-x-100' : 'scale-x-0',
                              )}
                            />
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setSelectedId(node.id)}
                          aria-current={isSelected ? 'step' : undefined}
                          className={cn(
                            'group relative z-10 flex w-full flex-col items-center gap-2 rounded-xl px-1 py-1 text-center outline-none',
                            'focus-visible:ring-2 focus-visible:ring-ring',
                          )}
                        >
                          <span
                            className={cn(
                              'relative flex size-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300 ease-out',
                              phase === 'done' &&
                                'border-primary bg-primary text-primary-foreground shadow-sm',
                              phase === 'current' &&
                                'scale-110 border-primary bg-background text-primary shadow-[0_0_0_4px] shadow-primary/20',
                              phase === 'upcoming' &&
                                'border-muted-foreground/30 bg-muted text-muted-foreground group-hover:border-primary/50 group-hover:text-foreground',
                              isSelected &&
                                'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
                            )}
                          >
                            {phase === 'done' ? (
                              <Check className="size-4 transition-transform duration-300" strokeWidth={2.5} />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span
                              className={cn(
                                'truncate text-xs font-semibold leading-tight transition-colors duration-300',
                                phase === 'upcoming' && !isSelected
                                  ? 'text-muted-foreground'
                                  : 'text-foreground',
                              )}
                              title={node.name}
                            >
                              {node.name}
                            </span>
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {node.inputCount === 0
                                ? 'No inputs'
                                : `${node.filledCount}/${node.inputCount} filled`}
                            </span>
                            {phase === 'done' ? (
                              <Badge variant="secondary" className="mx-auto h-5 px-1.5 text-[10px]">
                                Done
                              </Badge>
                            ) : phase === 'current' ? (
                              <Badge className="mx-auto h-5 px-1.5 text-[10px]">Current</Badge>
                            ) : (
                              <Badge variant="outline" className="mx-auto h-5 px-1.5 text-[10px]">
                                Next
                              </Badge>
                            )}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>

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
                            Fill fields for this stepper. All values are optional.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                            <Plus />
                            Add input
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void save()}
                            disabled={isSaving || detail.inputs.length === 0}
                          >
                            <Save />
                            {isSaving ? 'Saving…' : 'Save values'}
                          </Button>
                        </div>
                      </div>

                      {detail.inputs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No inputs on this stepper yet. Add a project-only field above.
                        </p>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {detail.inputs.map((input) => {
                            const code = input.inputTypeCode.toUpperCase()
                            const value = draft[input.id] ?? null

                            const header = (
                              <div className="flex items-center justify-between gap-2">
                                <Label htmlFor={`stepper-${input.id}`}>{input.label}</Label>
                                <div className="flex items-center gap-1">
                                  {input.isProjectOnly ? (
                                    <Badge variant="outline" className="text-[10px]">
                                      Project
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Template
                                    </Badge>
                                  )}
                                  {input.isProjectOnly ? (
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="ghost"
                                      aria-label={`Remove ${input.label}`}
                                      disabled={busyInputId === input.id}
                                      onClick={() => void removeInput(input.id)}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            )

                            if (code === 'YES_NO') {
                              const yesNoValue =
                                value === true ? 'yes' : value === false ? 'no' : 'unset'
                              return (
                                <div
                                  key={input.id}
                                  className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2"
                                >
                                  {header}
                                  <Select
                                    value={yesNoValue}
                                    onValueChange={(next) =>
                                      setDraft((current) => ({
                                        ...current,
                                        [input.id]:
                                          next === 'yes' ? true : next === 'no' ? false : null,
                                      }))
                                    }
                                  >
                                    <SelectTrigger id={`stepper-${input.id}`}>
                                      <SelectValue placeholder="Unset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unset">Unset</SelectItem>
                                      <SelectItem value="yes">Yes</SelectItem>
                                      <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )
                            }

                            if (code === 'DATE') {
                              return (
                                <div key={input.id} className="grid gap-1.5">
                                  {header}
                                  <DatePicker
                                    id={`stepper-${input.id}`}
                                    placeholder={input.label}
                                    value={toDate(value)}
                                    onChange={(date) =>
                                      setDraft((current) => ({
                                        ...current,
                                        [input.id]: formatDateValue(date),
                                      }))
                                    }
                                  />
                                </div>
                              )
                            }

                            if (code === 'NUMBER') {
                              return (
                                <div key={input.id} className="grid gap-1.5">
                                  {header}
                                  <Input
                                    id={`stepper-${input.id}`}
                                    type="number"
                                    placeholder={input.label}
                                    value={
                                      typeof value === 'number'
                                        ? String(value)
                                        : typeof value === 'string'
                                          ? value
                                          : ''
                                    }
                                    onChange={(event) => {
                                      const raw = event.target.value
                                      const parsed = Number.parseFloat(raw)
                                      setDraft((current) => ({
                                        ...current,
                                        [input.id]:
                                          raw.trim() === '' || !Number.isFinite(parsed)
                                            ? null
                                            : parsed,
                                      }))
                                    }}
                                  />
                                </div>
                              )
                            }

                            return (
                              <div key={input.id} className="grid gap-1.5">
                                {header}
                                <Input
                                  id={`stepper-${input.id}`}
                                  placeholder={input.label}
                                  maxLength={2000}
                                  value={
                                    typeof value === 'string'
                                      ? value
                                      : value == null
                                        ? ''
                                        : String(value)
                                  }
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      [input.id]: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            )
                          })}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add project input</DialogTitle>
            <DialogDescription>
              This field is only for the selected stepper on this project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="project-input-label">Label</Label>
              <Input
                id="project-input-label"
                value={addLabel}
                maxLength={120}
                placeholder="Input label"
                onChange={(event) => setAddLabel(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="project-input-type">Input type</Label>
              <Select
                items={types.map((type) => ({
                  value: type.id,
                  label: `${type.label} (${type.code})`,
                }))}
                value={addTypeId || undefined}
                onValueChange={(value) => {
                  if (value) setAddTypeId(value)
                }}
              >
                <SelectTrigger id="project-input-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label} ({type.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void addInput()} disabled={isAdding}>
              {isAdding ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
