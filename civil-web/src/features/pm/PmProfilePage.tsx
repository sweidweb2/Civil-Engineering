import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import { getUser, updateUser } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

const profileSchema = z.object({
  firstName: z.string().trim().max(100, 'First name must be at most 100 characters'),
  lastName: z.string().trim().max(100, 'Last name must be at most 100 characters'),
  displayName: z.string().trim().max(120, 'Display name must be at most 120 characters'),
  phone: z.string().trim().max(20, 'Phone must be at most 20 characters'),
})

type ProfileForm = z.infer<typeof profileSchema>

const EMPTY_FORM: ProfileForm = {
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
}

export function PmProfilePage() {
  useDocumentTitle('Profile')
  const userId = useAuthStore((state) => state.user?.id)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({})
  const [isSaving, setIsSaving] = useState(false)

  const loadProfile = useCallback(() => {
    if (!userId) return Promise.reject(new Error('Sign in to view your profile'))
    return getUser(userId).then((result) => result.data)
  }, [userId])
  const remote = useRemoteData(loadProfile)
  const account = remote.status === 'success' ? remote.data : null

  useEffect(() => {
    if (!account) return
    const profile = account.profile
    setForm({
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      displayName: profile?.displayName ?? '',
      phone: profile?.phone ?? '',
    })
  }, [account])

  function setField(key: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!userId) return

    const parsed = profileSchema.safeParse(form)
    if (!parsed.success) {
      const next: Partial<Record<keyof ProfileForm, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'firstName' || key === 'lastName' || key === 'displayName' || key === 'phone') {
          next[key] = issue.message
        }
      }
      setFieldErrors(next)
      return
    }

    setIsSaving(true)
    try {
      const result = await updateUser(userId, parsed.data)
      const profile = result.data.profile
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              profile: {
                firstName: profile?.firstName ?? null,
                lastName: profile?.lastName ?? null,
                displayName: profile?.displayName ?? null,
              },
            }
          : state.user,
      }))
      toast.success('Profile saved')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader className="mb-0" title="Profile" description="Your name and contact details." />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailSkeleton />}
      >
        <Card size="sm" className="max-w-xl">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <p className="text-sm text-muted-foreground">
              {account?.email} · {account?.role}
            </p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
              <Field data-invalid={Boolean(fieldErrors.firstName) || undefined}>
                <Label htmlFor="profile-first-name">First name</Label>
                <Input
                  id="profile-first-name"
                  value={form.firstName}
                  maxLength={100}
                  aria-invalid={Boolean(fieldErrors.firstName) || undefined}
                  onChange={(event) => setField('firstName', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.firstName }]} />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.lastName) || undefined}>
                <Label htmlFor="profile-last-name">Last name</Label>
                <Input
                  id="profile-last-name"
                  value={form.lastName}
                  maxLength={100}
                  aria-invalid={Boolean(fieldErrors.lastName) || undefined}
                  onChange={(event) => setField('lastName', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.lastName }]} />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.displayName) || undefined}>
                <Label htmlFor="profile-display-name">Display name</Label>
                <Input
                  id="profile-display-name"
                  value={form.displayName}
                  maxLength={120}
                  aria-invalid={Boolean(fieldErrors.displayName) || undefined}
                  onChange={(event) => setField('displayName', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.displayName }]} />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.phone) || undefined}>
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  value={form.phone}
                  maxLength={20}
                  aria-invalid={Boolean(fieldErrors.phone) || undefined}
                  onChange={(event) => setField('phone', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.phone }]} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </AsyncState>
    </div>
  )
}
