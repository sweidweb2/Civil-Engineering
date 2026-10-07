import { ArrowLeft, Building2, Calendar, MapPin, TrendingUp, FileText, Save } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
import { ProjectGallery } from '@/components/projects/ProjectGallery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  type Project,
  type ProjectStatus,
  type ProjectType,
  type UpdateProjectInput,
  getProjectById,
  updateProject,
} from '@/services/projects'

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
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(() => {
    if (!id) throw new Error('Project ID is required')
    return getProjectById(id)
  }, [id])

  const remote = useRemoteData(load)
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
      progress: project.progress,
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
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">Project ID is required</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/projects')}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Project Details</h1>
            <p className="text-sm text-muted-foreground">View and manage project information.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && <Button onClick={handleEdit}>Edit Project</Button>}
        </div>
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailSkeleton />}
      >
        {project && (
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
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as ProjectType })}
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                          <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                          <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
                          <SelectItem value="INFRASTRUCTURE">Infrastructure</SelectItem>
                          <SelectItem value="RENOVATION">Renovation</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
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
                        <p className="text-sm text-muted-foreground">{project.type || '—'}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status & Progress</CardTitle>
                <CardDescription>Current project status and completion.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <Field>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as ProjectStatus })}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="PLANNING">Planning</SelectItem>
                          <SelectItem value="APPROVED">Approved</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="ON_HOLD">On Hold</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <Label htmlFor="progress">Progress (%)</Label>
                      <Input
                        id="progress"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.progress ?? 0}
                        onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge variant={getStatusColor(project.status)} className="mt-1">
                          {project.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="size-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Progress</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{project.progress}%</span>
                        </div>
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
        )}
      </AsyncState>
    </div>
  )
}
