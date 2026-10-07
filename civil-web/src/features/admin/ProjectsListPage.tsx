import {
  Building2,
  Calendar,
  FolderKanban,
  MapPin,
  Plus,
  Clock,
  TrendingUp,
  MoreVertical,
  Pencil,
  Trash2,
  ImageIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
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
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  type Project,
  type ProjectType,
  type CreateProjectInput,
  listProjects,
  createProject,
  archiveProject,
} from '@/services/projects'
import { listProjectImages } from '@/services/projectImages'

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
  return status.replace(/_/g, ' ')
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

function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate()
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null)
  const Icon = getTypeIcon(project.type)

  useEffect(() => {
    listProjectImages(project.id)
      .then((res) => {
        const mainImage = res.data.find((img) => img.isMain)
        if (mainImage) {
          setMainImageUrl(mainImage.url)
        }
      })
      .catch(() => {
        // Silently fail if images can't be loaded
      })
  }, [project.id])

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20"
      onClick={() => navigate(`/admin/projects/${project.id}`)}
    >
      {mainImageUrl ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img src={mainImageUrl} alt={project.name} className="size-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-muted">
          <ImageIcon className="size-12 text-muted-foreground/30" />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="size-5 text-primary" />
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
                  navigate(`/admin/projects/${project.id}`)
                }}
              >
                <Pencil className="size-3" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  // This will be handled by parent component
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
              <span>{project.type}</span>
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

export function ProjectsListPage() {
  useDocumentTitle('Projects')
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const limit = 20

  const load = useCallback(() => listProjects(page, limit), [page])
  const remote = useRemoteData(load)

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

    setIsCreating(true)
    try {
      const result = await createProject(createData)
      toast.success('Project created successfully')
      setCreateOpen(false)
      void remote.refetch()
      navigate(`/admin/projects/${result.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteOpen = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
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
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage your civil engineering projects.</p>
        </div>
        <Button onClick={handleCreateOpen}>
          <Plus className="size-4" />
          Create Project
        </Button>
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
      >
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="size-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No projects yet. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} onClick={(e) => {
                // Check if click came from dropdown menu
                const target = e.target as HTMLElement
                if (target.closest('[role="menuitem"]')?.textContent?.includes('Archive')) {
                  handleDeleteOpen(project, e)
                }
              }}>
                <ProjectCard project={project} />
              </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter the basic information for your project. You can add more details later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
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
              <Label htmlFor="create-type">Project Type</Label>
              <Select
                value={createData.type}
                onValueChange={(value) => setCreateData({ ...createData, type: value as ProjectType })}
              >
                <SelectTrigger id="create-type">
                  <SelectValue placeholder="Select project type" />
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
            <div className="flex justify-end gap-3">
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
