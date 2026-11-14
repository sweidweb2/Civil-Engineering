import { Building2, Check, Copy, MapPin, MoreHorizontal, Pencil, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectOptions } from '@/features/projects/hooks/useProjectOptions'
import { cn } from '@/lib/utils'
import type { Project } from '@/services/projects'

type ProjectIdentityHeaderProps = {
  project: Project
  onEdit: () => void
  isEditing?: boolean
}

function statusBadgeClass(status: Project['status']) {
  switch (status) {
    case 'COMPLETED':
      return 'border-transparent bg-teal-500/15 text-teal-700 dark:text-teal-300'
    case 'IN_PROGRESS':
      return 'border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300'
    case 'CANCELLED':
      return 'border-transparent bg-destructive/10 text-destructive'
    default:
      return 'border-transparent bg-muted text-muted-foreground'
  }
}

export function ProjectIdentityHeader({ project, onEdit, isEditing }: ProjectIdentityHeaderProps) {
  const { t } = useTranslation(['projects', 'common'])
  const { statusLabel, typeLabel } = useProjectOptions()
  const location = [project.city, project.country].filter(Boolean).join(', ')

  const copyText = async (value: string, successKey: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t(successKey))
    } catch {
      toast.error(t('projects:couldNotCopy'))
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3 sm:gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 sm:size-14">
            <Building2 className="size-6 sm:size-7" aria-hidden />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.name}</h1>
              <Badge className={cn('gap-1', statusBadgeClass(project.status))}>
                {project.status === 'COMPLETED' ? <Check className="size-3" aria-hidden /> : null}
                {statusLabel(project.status)}
              </Badge>
            </div>
            {project.description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">{project.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {project.code ? (
                <button
                  type="button"
                  onClick={() => void copyText(project.code!, 'projects:codeCopied')}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <span className="font-mono">{project.code}</span>
                  <Copy className="size-3 text-muted-foreground" aria-hidden />
                </button>
              ) : null}
              {project.type ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
                  <Tag className="size-3 text-muted-foreground" aria-hidden />
                  {typeLabel(project.type)}
                </span>
              ) : null}
              {location ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
                  <MapPin className="size-3 text-muted-foreground" aria-hidden />
                  {location}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('projects:moreActions')}
              className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {project.code ? (
                <DropdownMenuItem
                  onClick={() => void copyText(project.code!, 'projects:codeCopied')}
                >
                  {t('projects:copyCode')}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={() => void copyText(window.location.href, 'projects:linkCopied')}
              >
                {t('projects:copyLink')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!isEditing ? (
            <Button type="button" onClick={onEdit}>
              <Pencil className="size-4" aria-hidden />
              {t('projects:edit')}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
