import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import {
  deleteMyManagerProfile,
  getMyManagerProfile,
  upsertMyManagerProfile,
  type ManagerProfile,
} from '@/services/manager-profiles'

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === '' || z.string().url().safeParse(value).success, {
    message: 'Enter a valid URL',
  })

const additionalSchema = z.object({
  headline: z.string().trim().max(160, 'Headline must be at most 160 characters'),
  bio: z.string().trim().max(4000, 'Bio must be at most 4000 characters'),
  yearsExperience: z.string().trim(),
  specialty: z.string().trim().max(200, 'Specialty must be at most 200 characters'),
  education: z.string().trim().max(2000, 'Education must be at most 2000 characters'),
  certifications: z.string().trim().max(2000, 'Certifications must be at most 2000 characters'),
  skills: z.string().trim().max(2000, 'Skills must be at most 2000 characters'),
  languages: z.string().trim().max(500, 'Languages must be at most 500 characters'),
  city: z.string().trim().max(80, 'City must be at most 80 characters'),
  country: z.string().trim().max(80, 'Country must be at most 80 characters'),
  website: optionalUrl,
  linkedinUrl: optionalUrl,
  cvUrl: optionalUrl,
  availability: z.string().trim().max(500, 'Availability must be at most 500 characters'),
  projectTypes: z.string().trim().max(1000, 'Project types must be at most 1000 characters'),
})

type AdditionalForm = z.infer<typeof additionalSchema>

const EMPTY_FORM: AdditionalForm = {
  headline: '',
  bio: '',
  yearsExperience: '',
  specialty: '',
  education: '',
  certifications: '',
  skills: '',
  languages: '',
  city: '',
  country: '',
  website: '',
  linkedinUrl: '',
  cvUrl: '',
  availability: '',
  projectTypes: '',
}

function formFromProfile(profile: ManagerProfile | null): AdditionalForm {
  if (!profile) return EMPTY_FORM
  return {
    headline: profile.headline ?? '',
    bio: profile.bio ?? '',
    yearsExperience:
      profile.yearsExperience === null || profile.yearsExperience === undefined
        ? ''
        : String(profile.yearsExperience),
    specialty: profile.specialty ?? '',
    education: profile.education ?? '',
    certifications: profile.certifications ?? '',
    skills: profile.skills ?? '',
    languages: profile.languages ?? '',
    city: profile.city ?? '',
    country: profile.country ?? '',
    website: profile.website ?? '',
    linkedinUrl: profile.linkedinUrl ?? '',
    cvUrl: profile.cvUrl ?? '',
    availability: profile.availability ?? '',
    projectTypes: profile.projectTypes ?? '',
  }
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function PmProfileAdditionalPanel() {
  const [form, setForm] = useState<AdditionalForm>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AdditionalForm, string>>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [hasRecord, setHasRecord] = useState(false)

  const load = useCallback(() => getMyManagerProfile().then((result) => result.data), [])
  const remote = useRemoteData(load, { queryKey: ['manager-profiles', 'me'] })
  const profile = remote.status === 'success' ? remote.data : null

  useEffect(() => {
    if (remote.status !== 'success') return
    setForm(formFromProfile(profile))
    setHasRecord(profile !== null)
    setFieldErrors({})
  }, [profile, remote.status])

  function setField(key: keyof AdditionalForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()

    const parsed = additionalSchema.safeParse(form)
    if (!parsed.success) {
      const next: Partial<Record<keyof AdditionalForm, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && key in EMPTY_FORM) {
          next[key as keyof AdditionalForm] = issue.message
        }
      }
      setFieldErrors(next)
      return
    }

    let yearsExperience: number | null = null
    const yearsRaw = parsed.data.yearsExperience.trim()
    if (yearsRaw !== '') {
      const years = Number.parseInt(yearsRaw, 10)
      if (!Number.isFinite(years) || years < 0 || years > 80) {
        setFieldErrors((current) => ({
          ...current,
          yearsExperience: 'Years of experience must be an integer from 0 to 80',
        }))
        return
      }
      yearsExperience = years
    }

    setIsSaving(true)
    try {
      const result = await upsertMyManagerProfile({
        headline: emptyToNull(parsed.data.headline),
        bio: emptyToNull(parsed.data.bio),
        yearsExperience,
        specialty: emptyToNull(parsed.data.specialty),
        education: emptyToNull(parsed.data.education),
        certifications: emptyToNull(parsed.data.certifications),
        skills: emptyToNull(parsed.data.skills),
        languages: emptyToNull(parsed.data.languages),
        city: emptyToNull(parsed.data.city),
        country: emptyToNull(parsed.data.country),
        website: emptyToNull(parsed.data.website),
        linkedinUrl: emptyToNull(parsed.data.linkedinUrl),
        cvUrl: emptyToNull(parsed.data.cvUrl),
        availability: emptyToNull(parsed.data.availability),
        projectTypes: emptyToNull(parsed.data.projectTypes),
      })
      setForm(formFromProfile(result.data))
      setHasRecord(true)
      toast.success('Additional info saved')
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save additional info')
    } finally {
      setIsSaving(false)
    }
  }

  async function onClear() {
    if (!hasRecord) {
      setForm(EMPTY_FORM)
      setFieldErrors({})
      setConfirmClear(false)
      return
    }

    setIsDeleting(true)
    try {
      await deleteMyManagerProfile()
      setForm(EMPTY_FORM)
      setHasRecord(false)
      setFieldErrors({})
      setConfirmClear(false)
      toast.success('Additional info cleared')
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not clear additional info')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailSkeleton />}
      >
        <Card size="sm">
          <CardHeader>
            <CardTitle>CV & additional info</CardTitle>
            <p className="text-sm text-muted-foreground">
              Optional professional details for your civil engineering profile. Leave fields blank if
              they do not apply.
            </p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Field
                  className="sm:col-span-2 xl:col-span-3"
                  data-invalid={Boolean(fieldErrors.headline) || undefined}
                >
                  <Label htmlFor="cv-headline">Professional headline</Label>
                  <Input
                    id="cv-headline"
                    value={form.headline}
                    maxLength={160}
                    placeholder="e.g. Civil engineer · Project manager"
                    aria-invalid={Boolean(fieldErrors.headline) || undefined}
                    onChange={(event) => setField('headline', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.headline }]} />
                </Field>

                <Field
                  className="sm:col-span-2 xl:col-span-3"
                  data-invalid={Boolean(fieldErrors.bio) || undefined}
                >
                  <Label htmlFor="cv-bio">Bio / summary</Label>
                  <Textarea
                    id="cv-bio"
                    value={form.bio}
                    maxLength={4000}
                    rows={4}
                    placeholder="Brief overview of your background and focus areas"
                    aria-invalid={Boolean(fieldErrors.bio) || undefined}
                    onChange={(event) => setField('bio', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.bio }]} />
                </Field>

                <Field data-invalid={Boolean(fieldErrors.yearsExperience) || undefined}>
                  <Label htmlFor="cv-years">Years of experience</Label>
                  <Input
                    id="cv-years"
                    type="number"
                    min={0}
                    max={80}
                    value={form.yearsExperience}
                    placeholder="e.g. 8"
                    aria-invalid={Boolean(fieldErrors.yearsExperience) || undefined}
                    onChange={(event) => setField('yearsExperience', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.yearsExperience }]} />
                </Field>

                <Field data-invalid={Boolean(fieldErrors.specialty) || undefined}>
                  <Label htmlFor="cv-specialty">Specialty</Label>
                  <Input
                    id="cv-specialty"
                    value={form.specialty}
                    maxLength={200}
                    placeholder="e.g. Structural, roads, water"
                    aria-invalid={Boolean(fieldErrors.specialty) || undefined}
                    onChange={(event) => setField('specialty', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.specialty }]} />
                </Field>

                <Field data-invalid={Boolean(fieldErrors.languages) || undefined}>
                  <Label htmlFor="cv-languages">Languages</Label>
                  <Input
                    id="cv-languages"
                    value={form.languages}
                    maxLength={500}
                    placeholder="e.g. Arabic, English, French"
                    aria-invalid={Boolean(fieldErrors.languages) || undefined}
                    onChange={(event) => setField('languages', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.languages }]} />
                </Field>

                <Field data-invalid={Boolean(fieldErrors.city) || undefined}>
                  <Label htmlFor="cv-city">City</Label>
                  <Input
                    id="cv-city"
                    value={form.city}
                    maxLength={80}
                    placeholder="e.g. Beirut"
                    aria-invalid={Boolean(fieldErrors.city) || undefined}
                    onChange={(event) => setField('city', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.city }]} />
                </Field>

                <Field data-invalid={Boolean(fieldErrors.country) || undefined}>
                  <Label htmlFor="cv-country">Country</Label>
                  <Input
                    id="cv-country"
                    value={form.country}
                    maxLength={80}
                    placeholder="e.g. Lebanon"
                    aria-invalid={Boolean(fieldErrors.country) || undefined}
                    onChange={(event) => setField('country', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.country }]} />
                </Field>

                <Field data-invalid={Boolean(fieldErrors.availability) || undefined}>
                  <Label htmlFor="cv-availability">Availability</Label>
                  <Input
                    id="cv-availability"
                    value={form.availability}
                    maxLength={500}
                    placeholder="e.g. Available for new projects Q2"
                    aria-invalid={Boolean(fieldErrors.availability) || undefined}
                    onChange={(event) => setField('availability', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.availability }]} />
                </Field>

                <Field data-invalid={Boolean(fieldErrors.website) || undefined}>
                  <Label htmlFor="cv-website">Website</Label>
                  <Input
                    id="cv-website"
                    type="url"
                    value={form.website}
                    maxLength={500}
                    placeholder="https://…"
                    aria-invalid={Boolean(fieldErrors.website) || undefined}
                    onChange={(event) => setField('website', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.website }]} />
                </Field>

                <Field data-invalid={Boolean(fieldErrors.linkedinUrl) || undefined}>
                  <Label htmlFor="cv-linkedin">LinkedIn</Label>
                  <Input
                    id="cv-linkedin"
                    type="url"
                    value={form.linkedinUrl}
                    maxLength={500}
                    placeholder="https://linkedin.com/in/…"
                    aria-invalid={Boolean(fieldErrors.linkedinUrl) || undefined}
                    onChange={(event) => setField('linkedinUrl', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.linkedinUrl }]} />
                </Field>

                <Field
                  className="sm:col-span-2 xl:col-span-3"
                  data-invalid={Boolean(fieldErrors.cvUrl) || undefined}
                >
                  <Label htmlFor="cv-url">CV link</Label>
                  <Input
                    id="cv-url"
                    type="url"
                    value={form.cvUrl}
                    maxLength={500}
                    placeholder="https://… link to your CV or portfolio PDF"
                    aria-invalid={Boolean(fieldErrors.cvUrl) || undefined}
                    onChange={(event) => setField('cvUrl', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.cvUrl }]} />
                </Field>

                <Field
                  className="sm:col-span-2 xl:col-span-3"
                  data-invalid={Boolean(fieldErrors.education) || undefined}
                >
                  <Label htmlFor="cv-education">Education</Label>
                  <Textarea
                    id="cv-education"
                    value={form.education}
                    maxLength={2000}
                    rows={3}
                    placeholder="Degrees, institutions, years"
                    aria-invalid={Boolean(fieldErrors.education) || undefined}
                    onChange={(event) => setField('education', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.education }]} />
                </Field>

                <Field
                  className="sm:col-span-2 xl:col-span-3"
                  data-invalid={Boolean(fieldErrors.certifications) || undefined}
                >
                  <Label htmlFor="cv-certifications">Certifications</Label>
                  <Textarea
                    id="cv-certifications"
                    value={form.certifications}
                    maxLength={2000}
                    rows={3}
                    placeholder="Licenses, PE, PMP, safety certs…"
                    aria-invalid={Boolean(fieldErrors.certifications) || undefined}
                    onChange={(event) => setField('certifications', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.certifications }]} />
                </Field>

                <Field
                  className="sm:col-span-2 xl:col-span-3"
                  data-invalid={Boolean(fieldErrors.skills) || undefined}
                >
                  <Label htmlFor="cv-skills">Skills</Label>
                  <Textarea
                    id="cv-skills"
                    value={form.skills}
                    maxLength={2000}
                    rows={3}
                    placeholder="Estimating, site supervision, AutoCAD…"
                    aria-invalid={Boolean(fieldErrors.skills) || undefined}
                    onChange={(event) => setField('skills', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.skills }]} />
                </Field>

                <Field
                  className="sm:col-span-2 xl:col-span-3"
                  data-invalid={Boolean(fieldErrors.projectTypes) || undefined}
                >
                  <Label htmlFor="cv-project-types">Preferred project types</Label>
                  <Textarea
                    id="cv-project-types"
                    value={form.projectTypes}
                    maxLength={1000}
                    rows={3}
                    placeholder="Residential, infrastructure, fit-out…"
                    aria-invalid={Boolean(fieldErrors.projectTypes) || undefined}
                    onChange={(event) => setField('projectTypes', event.target.value)}
                  />
                  <FieldError errors={[{ message: fieldErrors.projectTypes }]} />
                </Field>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving || isDeleting}
                  onClick={() => setConfirmClear(true)}
                >
                  Clear
                </Button>
                <Button type="submit" disabled={isSaving || isDeleting}>
                  {isSaving ? 'Saving…' : 'Save additional info'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </AsyncState>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear additional info?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasRecord
                ? 'This permanently removes your saved CV and additional details.'
                : 'This clears the form fields on this page.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={() => void onClear()}>
              {isDeleting ? 'Clearing…' : 'Clear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
