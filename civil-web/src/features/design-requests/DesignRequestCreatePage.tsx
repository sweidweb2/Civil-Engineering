import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { stageDateToIso } from '@/features/projects/lib/stage-dates'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import {
  createDesignRequest,
  DESIGN_CATEGORY_OPTIONS,
  type DesignCategory,
  getDesignerContact,
} from '@/services/design-requests'
import { listProjects } from '@/services/projects'

export function DesignRequestCreatePage() {
  const { t } = useTranslation(['designRequests', 'common'])
  useDocumentTitle(t('designRequests:documentTitleNew'))
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const portal = portalBaseFromPath(location.pathname)
  const prefilledProjectId = searchParams.get('projectId') ?? ''

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DesignCategory | ''>('')
  const [neededBy, setNeededBy] = useState<Date | undefined>()
  const [projectId, setProjectId] = useState(prefilledProjectId)
  const [file, setFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const schema = useMemo(
    () =>
      z.object({
        subject: z.string().trim().min(1, t('designRequests:validation.subjectRequired')),
        description: z.string().trim().min(1, t('designRequests:validation.descriptionRequired')),
        category: z.string().min(1, t('designRequests:validation.categoryRequired')),
        neededBy: z.date({ message: t('designRequests:validation.neededByRequired') }),
      }),
    [t],
  )

  const contactRemote = useRemoteData(() => getDesignerContact(), {
    queryKey: ['design-requests', 'designer-contact'],
  })

  const projectsRemote = useRemoteData(() => listProjects({ page: 1, limit: 100 }), {
    queryKey: ['design-requests', 'create-projects'],
  })

  const projects = projectsRemote.status === 'success' ? projectsRemote.data.data : []

  const submit = async () => {
    const parsed = schema.safeParse({
      subject,
      description,
      category,
      neededBy,
    })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (key && !next[key]) next[key] = issue.message
      }
      setFieldErrors(next)
      return
    }
    setFieldErrors({})
    setIsSaving(true)
    try {
      const created = await createDesignRequest({
        subject: parsed.data.subject,
        description: parsed.data.description,
        category: parsed.data.category as DesignCategory,
        neededBy: stageDateToIso(parsed.data.neededBy),
        projectId: projectId || null,
        file,
      })
      toast.success(t('designRequests:created'))
      navigate(`${portal}/design-requests/${created.id}`)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('designRequests:couldNotCreate'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('designRequests:documentTitleNew')}
        actions={
          <Link
            to={`${portal}/design-requests`}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            {t('designRequests:backToList')}
          </Link>
        }
      />

      <AsyncState
        isLoading={contactRemote.isLoading || projectsRemote.isLoading}
        error={
          contactRemote.isError
            ? contactRemote.error
            : projectsRemote.isError
              ? projectsRemote.error
              : undefined
        }
        onRetry={() => {
          void contactRemote.refetch()
          void projectsRemote.refetch()
        }}
        loadingFallback={<DetailSkeleton />}
      >
        {contactRemote.status === 'success' ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">{t('designRequests:designerContact')}</p>
            <p className="mt-1 text-muted-foreground">{t('designRequests:designerContactHint')}</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t('designRequests:email')}</dt>
                <dd>{contactRemote.data.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('designRequests:phone')}</dt>
                <dd>{contactRemote.data.phone ?? t('designRequests:noPhone')}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="grid max-w-2xl gap-4">
          <Field>
            <Label htmlFor="dr-subject">{t('designRequests:fields.subject')}</Label>
            <Input
              id="dr-subject"
              value={subject}
              placeholder={t('designRequests:placeholders.subject')}
              onChange={(e) => setSubject(e.target.value)}
            />
            {fieldErrors.subject ? (
              <p className="text-sm text-destructive">{fieldErrors.subject}</p>
            ) : null}
          </Field>

          <Field>
            <Label htmlFor="dr-description">{t('designRequests:fields.description')}</Label>
            <Textarea
              id="dr-description"
              rows={5}
              value={description}
              placeholder={t('designRequests:placeholders.description')}
              onChange={(e) => setDescription(e.target.value)}
            />
            {fieldErrors.description ? (
              <p className="text-sm text-destructive">{fieldErrors.description}</p>
            ) : null}
          </Field>

          <Field>
            <Label>{t('designRequests:fields.category')}</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as DesignCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('designRequests:placeholders.category')} />
              </SelectTrigger>
              <SelectContent>
                {DESIGN_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.category ? (
              <p className="text-sm text-destructive">{fieldErrors.category}</p>
            ) : null}
          </Field>

          <Field>
            <Label>{t('designRequests:fields.neededBy')}</Label>
            <DatePicker
              value={neededBy}
              placeholder={t('designRequests:placeholders.neededBy')}
              onChange={setNeededBy}
            />
            {fieldErrors.neededBy ? (
              <p className="text-sm text-destructive">{fieldErrors.neededBy}</p>
            ) : null}
          </Field>

          <Field>
            <Label>{t('designRequests:fields.project')}</Label>
            <Select
              value={projectId || '__none__'}
              onValueChange={(value) => setProjectId(value === '__none__' || !value ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('designRequests:placeholders.projectOptional')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {t('designRequests:placeholders.noProject')}
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <Label htmlFor="dr-file">{t('designRequests:fields.requirementFile')}</Label>
            <p className="text-sm text-muted-foreground">{t('designRequests:optionalFile')}</p>
            <Input
              id="dr-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>

          <div className="flex gap-3">
            <Button disabled={isSaving} onClick={() => void submit()}>
              {isSaving ? t('designRequests:creating') : t('designRequests:create')}
            </Button>
            <Link
              to={`${portal}/design-requests`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              {t('common:cancel')}
            </Link>
          </div>
        </div>
      </AsyncState>
    </div>
  )
}
