import { useCallback, useState } from 'react'
import { Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import {
  getProjectById,
  type Project,
  type ProjectStatus,
  type ProjectType,
  updateProject,
  type UpdateProjectInput,
} from '@/services/projects'

import { ProjectDetailsTab } from './components/details/ProjectDetailsTab'
import { ProjectIdentityHeader } from './components/ProjectIdentityHeader'
import { ProjectStagesStepper } from './components/ProjectStagesStepper'
import { useProjectOptions } from './hooks/useProjectOptions'
import { scheduleProgress } from './lib/schedule-progress'

function toDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function ScheduleProgress({
  startDate,
  endDate,
}: {
  startDate?: string | null
  endDate?: string | null
}) {
  const { t } = useTranslation('projects')
  const progress = scheduleProgress(startDate, endDate)
  return (
    <div>
      <p className="text-sm font-medium">{t('progress')}</p>
      <p className="text-xs text-muted-foreground">{t('progressHint')}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">{progress}%</span>
      </div>
    </div>
  )
}

export function ProjectDetailPage() {
  const { t } = useTranslation(['projects', 'common'])
  const { statusOptions, typeOptions } = useProjectOptions()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const projectsPath = `${portalBaseFromPath(location.pathname)}/projects`
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('stages')

  const load = useCallback(() => {
    if (!id) throw new Error(t('projects:idRequired'))
    return getProjectById(id)
  }, [id, t])

  const remote = useRemoteData(load, { queryKey: ['projects', 'detail', id ?? ''] })
  const project: Project | null = remote.status === 'success' ? remote.data.data : null

  useDocumentTitle(
    project ? t('projects:documentTitle', { name: project.name }) : t('projects:details'),
  )

  const breadcrumbs = [
    { label: t('projects:title'), to: projectsPath },
    { label: project?.name ?? t('projects:details') },
  ]

  const [formData, setFormData] = useState<UpdateProjectInput>({})

  const handleEdit = () => {
    if (!project) return
    setFormData({
      name: project.name,
      description: project.description || undefined,
      code: project.code || undefined,
      address: project.address || undefined,
      city: project.city || undefined,
      country: project.country || undefined,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      type: project.type || undefined,
      notes: project.notes || undefined,
    })
    setActiveTab('details')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({})
  }

  const handleSave = async () => {
    if (!id || !project) return
    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate).getTime() <= new Date(formData.startDate).getTime()
    ) {
      toast.error(t('projects:endAfterStart'))
      return
    }
    setIsSaving(true)
    try {
      await updateProject(id, formData)
      toast.success(t('projects:updated'))
      setIsEditing(false)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('projects:couldNotUpdate'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!id) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-muted-foreground">{t('projects:idRequired')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader className="mb-0" breadcrumbs={breadcrumbs} />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailSkeleton />}
      >
        {project && (
          <div className="min-w-0 space-y-5">
            <ProjectIdentityHeader project={project} onEdit={handleEdit} isEditing={isEditing} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 gap-4">
              <TabsList>
                <TabsTrigger value="stages">{t('projects:tabs.stages')}</TabsTrigger>
                <TabsTrigger value="details">{t('projects:tabs.details')}</TabsTrigger>
              </TabsList>

              <TabsContent value="stages" className="min-w-0">
                <ProjectStagesStepper project={project} />
              </TabsContent>

              <TabsContent value="details" className="min-w-0">
                {isEditing ? (
                  <div className="min-h-[min(42rem,calc(100svh-16rem))] space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>{t('projects:basicInfo')}</CardTitle>
                          <CardDescription>{t('projects:basicInfoDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Field>
                            <Label htmlFor="name">{t('projects:projectName')}</Label>
                            <Input
                              id="name"
                              value={formData.name || ''}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder={t('projects:projectNameShort')}
                              maxLength={200}
                            />
                          </Field>
                          <Field>
                            <Label htmlFor="code">{t('projects:projectCode')}</Label>
                            <Input
                              id="code"
                              value={formData.code || ''}
                              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                              placeholder={t('projects:projectCodePlaceholder')}
                              maxLength={50}
                            />
                          </Field>
                          <Field>
                            <Label htmlFor="description">{t('common:description')}</Label>
                            <Textarea
                              id="description"
                              value={formData.description || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                              }
                              placeholder={t('projects:projectDescriptionPlaceholder')}
                              maxLength={2000}
                              rows={4}
                            />
                          </Field>
                          <Field>
                            <Label htmlFor="type">{t('projects:projectType')}</Label>
                            <Select
                              items={typeOptions}
                              value={formData.type}
                              onValueChange={(value) =>
                                setFormData({ ...formData, type: value as ProjectType })
                              }
                            >
                              <SelectTrigger id="type">
                                <SelectValue placeholder={t('projects:selectType')} />
                              </SelectTrigger>
                              <SelectContent>
                                {typeOptions.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>{t('projects:statusProgress')}</CardTitle>
                          <CardDescription>
                            {t('projects:statusProgressDescription')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Field>
                            <Label htmlFor="status">{t('common:status')}</Label>
                            <Select
                              items={statusOptions}
                              value={formData.status}
                              onValueChange={(value) =>
                                setFormData({ ...formData, status: value as ProjectStatus })
                              }
                            >
                              <SelectTrigger id="status">
                                <SelectValue placeholder={t('projects:selectStatus')} />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <Label htmlFor="startDate">{t('projects:startDate')}</Label>
                            <DatePicker
                              id="startDate"
                              value={toDate(formData.startDate)}
                              onChange={(date) =>
                                setFormData({
                                  ...formData,
                                  startDate: date ? date.toISOString() : null,
                                })
                              }
                              placeholder={t('projects:selectStartDate')}
                            />
                          </Field>
                          <Field>
                            <Label htmlFor="endDate">{t('projects:endDate')}</Label>
                            <DatePicker
                              id="endDate"
                              value={toDate(formData.endDate)}
                              onChange={(date) =>
                                setFormData({
                                  ...formData,
                                  endDate: date ? date.toISOString() : null,
                                })
                              }
                              placeholder={t('projects:selectEndDate')}
                            />
                          </Field>
                          <ScheduleProgress
                            startDate={formData.startDate}
                            endDate={formData.endDate}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>{t('projects:location')}</CardTitle>
                          <CardDescription>{t('projects:locationDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Field>
                            <Label htmlFor="address">{t('projects:address')}</Label>
                            <Input
                              id="address"
                              value={formData.address || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                              }
                              placeholder={t('projects:streetAddressPlaceholder')}
                              maxLength={500}
                            />
                          </Field>
                          <Field>
                            <Label htmlFor="city">{t('projects:city')}</Label>
                            <Input
                              id="city"
                              value={formData.city || ''}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                              placeholder={t('projects:city')}
                              maxLength={100}
                            />
                          </Field>
                          <Field>
                            <Label htmlFor="country">{t('projects:country')}</Label>
                            <Input
                              id="country"
                              value={formData.country || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, country: e.target.value })
                              }
                              placeholder={t('projects:country')}
                              maxLength={100}
                            />
                          </Field>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>{t('projects:additionalNotes')}</CardTitle>
                          <CardDescription>{t('projects:notesDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Field>
                            <Label htmlFor="notes">{t('common:notes')}</Label>
                            <Textarea
                              id="notes"
                              value={formData.notes || ''}
                              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                              placeholder={t('projects:notesPlaceholder')}
                              rows={6}
                            />
                          </Field>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardContent className="flex items-center justify-end gap-3 pt-6">
                        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                          {t('common:cancel')}
                        </Button>
                        <Button onClick={() => void handleSave()} disabled={isSaving}>
                          <Save className="size-4" />
                          {isSaving ? t('common:saving') : t('projects:saveChanges')}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <ProjectDetailsTab
                    project={project}
                    onEdit={handleEdit}
                    onUpdated={() => void remote.refetch()}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </AsyncState>
    </div>
  )
}
