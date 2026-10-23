import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from 'cn'
import {
  Building2,
  Calendar,
  Clock,
  FolderKanban,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { CardGridSkeleton, ProjectCardMedia } from '@/components/feedback/skeletons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePagedQuery } from '@/hooks/usePagedQuery'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import {
  archiveProject,
  createProject,
  type CreateProjectInput,
  listProjects,
  type Project,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  type ProjectStatus,
  projectStatusLabel,
  type ProjectType,
  projectTypeLabel,
} from '@/services/projects'

import { ProjectProgressTimeline } from './components/ProjectProgressTimeline'
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

function getStatusLabel(status: string): string {
  return projectStatusLabel(status)
}

function getTypeIcon(type: string | null) {
  switch (type) {
    case 'RESIDENTIAL':
      return Building2
    case 'COMMERCIAL':
    case 'INDUSTRIAL':
      return FolderKanban
    case 'INFRASTRUCTURE':
      return MapPin
    default:
      return Building2
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return '—'
  }
}

function ProjectCardImage({ src, alt }: { src: string; alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setIsLoaded(false)
    const image = imgRef.current
    if (image?.complete && image.naturalWidth > 0) {
      setIsLoaded(true)
    }
  }, [src])

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-muted">
      {isLoaded ? null : (
        <Skeleton className="absolute inset-0 size-full rounded-none" aria-hidden />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn('size-full object-cover', isLoaded ? 'opacity-100' : 'opacity-0')}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(true)}
      />
    </div>
  )
}

function ProjectCard({
  project,
  variant,
  onArchive,
}: {
  project: Project
  variant: number
  onArchive: (project: Project) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const projectPath = `${portalBaseFromPath(location.pathname)}/projects/${project.id}`
  const mainImageUrl = project.mainImageUrl ?? null

  return (
    <Card
      className="cursor-pointer overflow-hidden pt-0! transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20"
      onClick={() => navigate(projectPath)}
    >
      {mainImageUrl ? (
        <ProjectCardImage src={mainImageUrl} alt={project.name} />
      ) : (
        <ProjectCardMedia variant={variant} />
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              {createElement(getTypeIcon(project.type), { className: 'size-5 text-primary' })}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="line-clamp-1 text-base">{project.name}</CardTitle>
              {project.code && <CardDescription className="text-xs">Code: {project.code}</CardDescription>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(projectPath)
                }}
              >
                <Pencil className="size-3" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(event) => {
                  event.stopPropagation()
                  onArchive(project)
                }}
              >
                <Trash2 className="size-3" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {project.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Badge variant={getStatusColor(project.status)} className="text-xs">
              {getStatusLabel(project.status)}
            </Badge>
          </div>
          {project.type && (
            <div className="flex items-center gap-1">
              <Building2 className="size-3" />
              <span>{projectTypeLabel(project.type)}</span>
            </div>
          )}
        </div>

        {project.progress > 0 && (
          <div className="flex items-center gap-2">
            <TrendingUp className="size-3 text-muted-foreground" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${project.progress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{project.progress}%</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {project.startDate && (
            <div className="flex items-center gap-1">
              <Calendar className="size-3" />
              <span>{formatDate(project.startDate)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="size-3" />
            <span>{formatDate(project.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  ...PROJECT_STATUS_OPTIONS,
]

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All types' },
  ...PROJECT_TYPE_OPTIONS,
]

export function ProjectsListPage() {
  useDocumentTitle('Manage projects')
  const navigate = useNavigate()
  const location = useLocation()
  const isPmPortal = location.pathname.startsWith('/pm')
  const { query, setQuery, debouncedQuery, page, setPage } = usePagedQuery()
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ProjectType>('all')
  const [timelineVersion, setTimelineVersion] = useState(0)
  const limit = 20

  const load = useCallback(
    () =>
      listProjects({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        q: debouncedQuery || undefined,
      }),
    [debouncedQuery, page, statusFilter, typeFilter],
  )
  const remote = useRemoteData(load, {
    queryKey: ['projects', 'list', page, debouncedQuery, statusFilter, typeFilter],
  })

  const projects: Project[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = remote.status === 'success' ? remote.data.meta.totalPages : 1

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createData, setCreateData] = useState<CreateProjectInput>({
    name: '',
  })
  const [isCreating, setIsCreating] = useState(false)

  // Delete confirmation state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreateOpen = () => {
    setCreateData({ name: '' })
    setCreateOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!createData.name.trim()) {
      toast.error('Project name is required')
      return
    }
    if (
      createData.startDate &&
      createData.endDate &&
      new Date(createData.endDate).getTime() <= new Date(createData.startDate).getTime()
    ) {
      toast.error('End date must be after the start date')
      return
    }

    setIsCreating(true)
    try {
      const result = await createProject(createData)
      toast.success('Project created successfully')
      setCreateOpen(false)
      setTimelineVersion((version) => version + 1)
      void remote.refetch()
      navigate(`${portalBaseFromPath(location.pathname)}/projects/${result.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteOpen = (project: Project) => {
    setDeletingProject(project)
    setDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return

    setIsDeleting(true)
    try {
      await archiveProject(deletingProject.id)
      toast.success('Project archived successfully')
      setDeleteOpen(false)
      setTimelineVersion((version) => version + 1)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive project')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage projects</h1>
          <p className="text-sm text-muted-foreground">Manage your civil engineering projects.</p>
        </div>
        <Button onClick={handleCreateOpen}>
          <Plus className="size-4" />
          Create Project
        </Button>
      </div>

      {isPmPortal ? null : <ProjectProgressTimeline refreshKey={timelineVersion} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, code, or city…"
          aria-label="Filter projects"
          className="max-w-sm"
          maxLength={120}
        />
        <Select
          items={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onValueChange={(value) => {
            if (!value) return
            if (value === 'all' || PROJECT_STATUS_OPTIONS.some((option) => option.value === value)) {
              setStatusFilter(value as 'all' | ProjectStatus)
              setPage(1)
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={TYPE_FILTER_OPTIONS}
          value={typeFilter}
          onValueChange={(value) => {
            if (!value) return
            if (value === 'all' || PROJECT_TYPE_OPTIONS.some((option) => option.value === value)) {
              setTypeFilter(value as 'all' | ProjectType)
              setPage(1)
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Filter by type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={
          <CardGridSkeleton media="plain" className="gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
        }
      >
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="size-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {debouncedQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No projects match these filters.'
                  : 'No projects yet. Create your first one!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                variant={index}
                onArchive={handleDeleteOpen}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </AsyncState>

      {/* Create Project Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter the basic information for your project. You can add more details later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="create-name">Project Name</Label>
              <Input
                id="create-name"
                value={createData.name}
                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                placeholder="e.g., Downtown Office Building"
                maxLength={200}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="create-code">Project Code</Label>
              <Input
                id="create-code"
                value={createData.code || ''}
                onChange={(e) => setCreateData({ ...createData, code: e.target.value })}
                placeholder="e.g., PRJ-2024-001"
                maxLength={50}
              />
            </Field>
            <Field>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={createData.description || ''}
                onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                placeholder="Brief description of the project..."
                maxLength={2000}
                rows={3}
              />
            </Field>
            <Field>
              <Label htmlFor="create-type">Project Type</Label>
              <Select
                items={PROJECT_TYPE_OPTIONS}
                value={createData.type}
                onValueChange={(value) => setCreateData({ ...createData, type: value as ProjectType })}
              >
                <SelectTrigger id="create-type" className="w-full">
                  <SelectValue placeholder="Select project type" />
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
            <Field>
              <Label htmlFor="create-start">Start date</Label>
              <DatePicker
                id="create-start"
                value={createData.startDate ? new Date(createData.startDate) : undefined}
                onChange={(date) =>
                  setCreateData({ ...createData, startDate: date ? date.toISOString() : null })
                }
                placeholder="Select start date"
              />
            </Field>
            <Field>
              <Label htmlFor="create-end">End date</Label>
              <DatePicker
                id="create-end"
                value={createData.endDate ? new Date(createData.endDate) : undefined}
                onChange={(date) =>
                  setCreateData({ ...createData, endDate: date ? date.toISOString() : null })
                }
                placeholder="Select end date"
              />
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Progress is the time elapsed from the start date to the end date
              {createData.startDate && createData.endDate
                ? ` (${scheduleProgress(createData.startDate, createData.endDate)}%).`
                : '. Set both dates to calculate it.'}
            </p>
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{deletingProject?.name}</strong>? The project will be moved
              to the archive and won't appear in the main list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteConfirm()} disabled={isDeleting}>
              {isDeleting ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
