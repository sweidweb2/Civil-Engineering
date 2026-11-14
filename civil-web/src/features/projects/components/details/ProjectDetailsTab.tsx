import { useCallback, useState } from 'react'
import { ArrowUp, Check, Copy, ExternalLink, Lock, MapPin, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ProjectGallery } from '@/components/projects/ProjectGallery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectOptions } from '@/features/projects/hooks/useProjectOptions'
import {
  scheduleDurationDays,
  scheduleDurationMonthsLabel,
  scheduleProgress,
} from '@/features/projects/lib/schedule-progress'
import { GALLERY_MAX_IMAGES } from '@/hooks/useGalleryImages'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/services/auth'
import { projectImagesApi } from '@/services/projectImages'
import type { Project } from '@/services/projects'
import { updateProject } from '@/services/projects'
import { useAuthStore } from '@/stores/authStore'

type ProjectDetailsTabProps = {
  project: Project
  onEdit: () => void
  onUpdated: () => void
}

function fullAddress(project: Project): string {
  return [project.address, project.city, project.country].filter(Boolean).join(', ')
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

function userDisplayName(user: AuthUser | null): string {
  if (!user) return '—'
  const name = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ').trim()
  return name || user.profile?.displayName || user.email
}

function userInitials(user: AuthUser | null): string {
  if (!user) return '?'
  const fromName = [user.profile?.firstName, user.profile?.lastName]
    .filter((part): part is string => Boolean(part))
    .map((part) => part[0]!)
    .join('')
  if (fromName) return fromName.slice(0, 2).toUpperCase()
  return user.email.slice(0, 2).toUpperCase()
}

function LocationMapPreview({ hasLocation }: { hasLocation: boolean }) {
  const { t } = useTranslation('projects')

  if (!hasLocation) {
    return (
      <div className="relative overflow-hidden rounded-xl border bg-muted/40">
        <div className="aspect-[16/10] space-y-3 p-4">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
          </div>
          <Skeleton className="h-full min-h-16 w-full rounded-lg" />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/10">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <MapPin className="size-3" aria-hidden />
            {t('locationMapSkeleton')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-muted/30"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(13,148,136,0.18),transparent_45%),radial-gradient(circle_at_70%_65%,rgba(15,23,42,0.06),transparent_40%)]" />
      <div className="absolute start-[18%] top-[28%] h-10 w-24 rounded-full bg-background/50 blur-md" />
      <div className="absolute end-[22%] bottom-[24%] h-14 w-20 rounded-full bg-background/40 blur-md" />
      <div className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex flex-col items-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg ring-4 ring-teal-600/20">
            <MapPin className="size-4" />
          </span>
          <span className="mt-[-2px] size-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-teal-600" />
        </div>
      </div>
    </div>
  )
}

export function ProjectDetailsTab({ project, onEdit, onUpdated }: ProjectDetailsTabProps) {
  const { t } = useTranslation(['projects', 'common'])
  const { formatMediumDate, formatMediumDateTime } = useLocaleFormat()
  const { statusLabel, typeLabel } = useProjectOptions()
  const user = useAuthStore((state) => state.user)
  const [noteDraft, setNoteDraft] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  const loadImages = useCallback(() => projectImagesApi.list(project.id), [project.id])
  const imagesRemote = useRemoteData(loadImages, { queryKey: ['project-images', project.id] })
  const photoCount = imagesRemote.status === 'success' ? imagesRemote.data.data.length : 0

  const days = scheduleDurationDays(project.startDate, project.endDate)
  const elapsed = scheduleProgress(project.startDate, project.endDate)
  const address = fullAddress(project)
  const hasLocation = Boolean(address)

  const copyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      toast.success(t('projects:addressCopied'))
    } catch {
      toast.error(t('projects:couldNotCopy'))
    }
  }

  const openInMaps = () => {
    if (!address) return
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const submitNote = async () => {
    const text = noteDraft.trim()
    if (!text) return
    setIsSavingNote(true)
    try {
      const nextNotes = project.notes?.trim() ? `${project.notes.trim()}\n\n${text}` : text
      await updateProject(project.id, { notes: nextNotes })
      setNoteDraft('')
      toast.success(t('projects:noteAdded'))
      onUpdated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('projects:couldNotUpdate'))
    } finally {
      setIsSavingNote(false)
    }
  }

  return (
    <div className="min-h-[min(42rem,calc(100svh-16rem))] space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card size="sm" className="p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('projects:summary.duration')}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {days != null ? t('projects:summary.daysValue', { count: days }) : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {days != null
              ? t('projects:summary.aboutMonths', { months: scheduleDurationMonthsLabel(days) })
              : t('projects:summary.setSchedule')}
          </p>
        </Card>

        <Card size="sm" className="p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('projects:summary.scheduleElapsed')}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{elapsed}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-teal-600 transition-all"
              style={{ width: `${elapsed}%` }}
            />
          </div>
        </Card>

        <Card size="sm" className="p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('projects:summary.handedOver')}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {formatMediumDate(project.endDate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('projects:summary.plannedEndDate')}
          </p>
        </Card>

        <Card size="sm" className="p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('projects:summary.sitePhotos')}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {photoCount} / {GALLERY_MAX_IMAGES}
          </p>
          <p
            className={cn(
              'mt-1 text-xs',
              photoCount === 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
            )}
          >
            {photoCount === 0
              ? t('projects:summary.noneUploaded')
              : t('projects:summary.photosUploaded', { count: photoCount })}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('projects:schedule.title')}</CardTitle>
              <CardDescription>{t('projects:schedule.hint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-muted/20 px-4 py-6 sm:px-6">
                <div className="relative flex items-start justify-between gap-4">
                  <div
                    className="absolute start-6 end-6 top-[0.85rem] h-1.5 rounded-full bg-teal-600/90"
                    aria-hidden
                  />
                  <div className="relative z-10 flex flex-col items-start gap-2">
                    <span className="size-4 rounded-full border-2 border-teal-700 bg-teal-600 ring-4 ring-background" />
                    <p className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      {t('projects:schedule.start')}
                    </p>
                    <p className="text-sm font-semibold">{formatMediumDate(project.startDate)}</p>
                  </div>
                  <div className="relative z-10 flex flex-col items-center gap-1 pt-6 text-center">
                    <p className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      {t('projects:schedule.duration')}
                    </p>
                    <p className="text-sm font-semibold">
                      {days != null ? t('projects:summary.daysValue', { count: days }) : '—'}
                    </p>
                  </div>
                  <div className="relative z-10 flex flex-col items-end gap-2">
                    <span className="size-4 rounded-full border-2 border-teal-700 bg-teal-600 ring-4 ring-background" />
                    <p className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      {t('projects:schedule.end')}
                    </p>
                    <p className="text-sm font-semibold">{formatMediumDate(project.endDate)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t('projects:information.title')}</CardTitle>
                  <CardDescription>{t('projects:information.description')}</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  aria-label={t('projects:edit')}
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t('projects:projectName')}
                  </dt>
                  <dd className="text-sm font-medium">{project.name}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t('projects:projectCode')}
                  </dt>
                  <dd className="font-mono text-sm font-medium">{project.code || '—'}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t('common:type')}
                  </dt>
                  <dd className="text-sm font-medium">{typeLabel(project.type)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t('common:status')}
                  </dt>
                  <dd>
                    <Badge className={cn('gap-1', statusBadgeClass(project.status))}>
                      {project.status === 'COMPLETED' ? (
                        <Check className="size-3" aria-hidden />
                      ) : null}
                      {statusLabel(project.status)}
                    </Badge>
                  </dd>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <dt className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t('common:description')}
                  </dt>
                  <dd className="text-sm text-muted-foreground">{project.description || '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <ProjectGallery projectId={project.id} />
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t('projects:location')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <LocationMapPreview hasLocation={hasLocation} />
              <p className="text-sm text-muted-foreground">
                {hasLocation ? address : t('projects:locationEmpty')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!hasLocation}
                  onClick={() => void copyAddress()}
                >
                  <Copy className="size-3.5" aria-hidden />
                  {t('projects:copyAddress')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!hasLocation}
                  onClick={openInMaps}
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  {t('projects:openInMaps')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{t('projects:internalNotes.title')}</CardTitle>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" aria-hidden />
                  {t('projects:internalNotes.teamOnly')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.notes?.trim() ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-teal-600 text-[0.65rem] font-semibold text-white">
                      {userInitials(user)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {userDisplayName(user) || t('projects:internalNotes.teamAuthor')}
                      </p>
                      <p className="text-[0.65rem] text-muted-foreground">
                        {formatMediumDate(project.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{project.notes}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('projects:internalNotes.empty')}</p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder={t('projects:internalNotes.addPlaceholder')}
                  disabled={isSavingNote}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void submitNote()
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  disabled={isSavingNote || !noteDraft.trim()}
                  onClick={() => void submitNote()}
                  aria-label={t('projects:internalNotes.add')}
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="p-4">
            <p className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
              {t('projects:record.title')}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t('common:created')}</dt>
                <dd className="text-end font-medium">{formatMediumDateTime(project.createdAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{t('projects:record.lastUpdated')}</dt>
                <dd className="text-end font-medium">{formatMediumDateTime(project.updatedAt)}</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  )
}
