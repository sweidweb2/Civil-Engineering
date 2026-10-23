import { useCallback, useState } from 'react'
import { Building2, Calendar, FileText, MapPin, Save, TrendingUp } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
import { ProjectGallery } from '@/components/projects/ProjectGallery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  getProjectById,
  type Project,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  type ProjectStatus,
  projectStatusLabel,
  type ProjectType,
  projectTypeLabel,
  updateProject,
  type UpdateProjectInput,
} from '@/services/projects'

import { ProjectSteppersSection } from './components/ProjectSteppersSection'
import { scheduleProgress } from './lib/schedule-progress'

function getStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'IN_PROGRESS':
      return 'default'
    case 'COMPLETED':
      return 'secondary'
    case 'CANCELLED':
      return 'destructive'
    default:
      return 'outline'
  }
}

function toDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatDate(iso: string | null | undefined) {
  const date = toDate(iso)
  return date ? date.toLocaleDateString() : '—'
}

function ScheduleProgress({
  startDate,
  endDate,
}: {
  startDate?: string | null
  endDate?: string | null
}) {
  const progress = scheduleProgress(startDate, endDate)
  return (
    <div>
      <p className="text-sm font-medium">Progress</p>
      <p className="text-xs text-muted-foreground">Elapsed time from the start date to the end date.</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">{progress}%</span>
      </div>
    </div>
  )
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '—'
  }
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<'steppers' | 'details'>('steppers')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(() => {
    if (!id) throw new Error('Project ID is required')
    return getProjectById(id)
  }, [id])

  const remote = useRemoteData(load, { queryKey: ['projects', 'detail', id ?? ''] })
  const project: Project | null = remote.status === 'success' ? remote.data.data : null

  useDocumentTitle(project ? `Project: ${project.name}` : 'Project Details')

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
      toast.error('End date must be after the start date')
      return
    }
    setIsSaving(true)
    try {
      await updateProject(id, formData)
      toast.success('Project updated successfully')
      setIsEditing(false)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update project')
    } finally {
      setIsSaving(false)
    }
  }

  if (!id) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-muted-foreground">Project ID is required</p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailSkeleton />}
      >
        {project && (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (value === 'steppers' || value === 'details') setActiveTab(value)
            }}
            className="min-w-0 gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="steppers">Steppers</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              {activeTab === 'details' && !isEditing ? (
                <Button onClick={handleEdit}>Edit Project</Button>
              ) : null}
            </div>

            <TabsContent value="steppers" className="min-w-0">
              <ProjectSteppersSection projectId={project.id} />
            </TabsContent>

            <TabsContent value="details" className="min-w-0">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Core project details and identification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <Field>
                      <Label htmlFor="name">Project Name</Label>
                      <Input
                        id="name"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Project name"
                        maxLength={200}
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="code">Project Code</Label>
                      <Input
                        id="code"
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g., PRJ-2024-001"
                        maxLength={50}
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Project description"
                        maxLength={2000}
                        rows={4}
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="type">Project Type</Label>
                      <Select
                        items={PROJECT_TYPE_OPTIONS}
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as ProjectType })}
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Project Name</p>
                        <p className="text-sm text-muted-foreground">{project.name}</p>
                      </div>
                    </div>
                    {project.code && (
                      <div className="flex items-center gap-3">
                        <FileText className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Project Code</p>
                          <p className="text-sm text-muted-foreground">{project.code}</p>
                        </div>
                      </div>
                    )}
                    {project.description && (
                      <div className="flex items-start gap-3">
                        <FileText className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Description</p>
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Building2 className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Type</p>
                        <p className="text-sm text-muted-foreground">{projectTypeLabel(project.type)}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status & Progress</CardTitle>
                <CardDescription>Status, schedule, and progress from the start date.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <Field>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        items={PROJECT_STATUS_OPTIONS}
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as ProjectStatus })}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <Label htmlFor="startDate">Start date</Label>
                      <DatePicker
                        id="startDate"
                        value={toDate(formData.startDate)}
                        onChange={(date) =>
                          setFormData({ ...formData, startDate: date ? date.toISOString() : null })
                        }
                        placeholder="Select start date"
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="endDate">End date</Label>
                      <DatePicker
                        id="endDate"
                        value={toDate(formData.endDate)}
                        onChange={(date) =>
                          setFormData({ ...formData, endDate: date ? date.toISOString() : null })
                        }
                        placeholder="Select end date"
                      />
                    </Field>
                    <ScheduleProgress startDate={formData.startDate} endDate={formData.endDate} />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge variant={getStatusColor(project.status)} className="mt-1">
                          {projectStatusLabel(project.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Start date</p>
                        <p className="text-sm text-muted-foreground">{formatDate(project.startDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">End date</p>
                        <p className="text-sm text-muted-foreground">{formatDate(project.endDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="size-4 text-muted-foreground" />
                      <div className="flex-1">
                        <ScheduleProgress startDate={project.startDate} endDate={project.endDate} />
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(project.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Updated</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(project.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isEditing ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Location</CardTitle>
                    <CardDescription>Project site location details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Field>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Street address"
                        maxLength={500}
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                        maxLength={100}
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country || ''}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="Country"
                        maxLength={100}
                      />
                    </Field>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Additional Notes</CardTitle>
                    <CardDescription>Internal notes and comments.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Field>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Internal notes..."
                        rows={6}
                      />
                    </Field>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardContent className="flex items-center justify-end gap-3 pt-6">
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button onClick={() => void handleSave()} disabled={isSaving}>
                      <Save className="size-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {(project.address || project.city || project.country) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Location</CardTitle>
                      <CardDescription>Project site location.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {project.address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="size-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Address</p>
                            <p className="text-sm text-muted-foreground">{project.address}</p>
                          </div>
                        </div>
                      )}
                      {project.city && (
                        <div className="flex items-center gap-3">
                          <MapPin className="size-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">City</p>
                            <p className="text-sm text-muted-foreground">{project.city}</p>
                          </div>
                        </div>
                      )}
                      {project.country && (
                        <div className="flex items-center gap-3">
                          <MapPin className="size-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Country</p>
                            <p className="text-sm text-muted-foreground">{project.country}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                {project.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                      <CardDescription>Internal notes and comments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{project.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <ProjectGallery projectId={project.id} />
              </>
            )}
          </div>
            </TabsContent>
          </Tabs>
        )}
      </AsyncState>
    </div>
  )
}
