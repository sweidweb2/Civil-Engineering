import { type FormEvent,useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRemoteData } from '@/hooks/useRemoteData'
import { optimizeIfImage } from '@/lib/optimizeImage'
import { ApiError } from '@/services/api'
import { changePassword } from '@/services/auth'
import {
  clearUserAvatar,
  getUser,
  updateUser,
  uploadUserAvatar,
} from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/jpg'
const AVATAR_MAX_BYTES = 8 * 1024 * 1024

function AvatarUploadProgress({ value }: { value: number }) {
  const label = value >= 100 ? 'Finishing…' : 'Uploading photo…'
  return (
    <div className="flex w-full min-w-[12rem] max-w-sm flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {label}
        </span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Photo upload progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

const profileSchema = z.object({
  firstName: z.string().trim().max(100, 'First name must be at most 100 characters'),
  lastName: z.string().trim().max(100, 'Last name must be at most 100 characters'),
  displayName: z.string().trim().max(120, 'Display name must be at most 120 characters'),
  phone: z.string().trim().max(20, 'Phone must be at most 20 characters'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(/[A-Za-z]/, 'Password must contain a letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string().min(1, 'Confirm password is required').max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

const EMPTY_FORM: ProfileForm = {
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
}

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export function PmProfileGeneralPanel() {
  const userId = useAuthStore((state) => state.user?.id)
  const logout = useAuthStore((state) => state.logout)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM)
  const [passwordErrors, setPasswordErrors] = useState<
    Partial<Record<keyof PasswordForm, string>>
  >({})
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0)
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadProfile = useCallback(() => {
    if (!userId) return Promise.reject(new Error('Sign in to view your profile'))
    return getUser(userId)
  }, [userId])
  const remote = useRemoteData(loadProfile, { queryKey: ['users', 'profile', userId ?? ''] })
  const account = remote.status === 'success' ? remote.data.data : null
  const avatarFromMeta =
    remote.status === 'success' ? remote.data.meta.avatarDownloadUrl : null

  useEffect(() => {
    if (!account) return
    const profile = account.profile
    setForm({
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      displayName: profile?.displayName ?? '',
      phone: profile?.phone ?? '',
    })
    setAvatarUrl(avatarFromMeta)
  }, [account, avatarFromMeta])

  useEffect(() => {
    if (remote.status !== 'error') return
    if (!(remote.error instanceof ApiError) || remote.error.status !== 404) return
    toast.error('Your session is out of date. Please sign in again.')
    void logout()
  }, [logout, remote.error, remote.status])

  function setField(key: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function setPasswordField(key: keyof PasswordForm, value: string) {
    setPasswordForm((current) => ({ ...current, [key]: value }))
    setPasswordErrors((current) => ({ ...current, [key]: undefined }))
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

  function avatarInitials() {
    const fromForm = [form.firstName, form.lastName].filter(Boolean).join(' ')
    const label = form.displayName || fromForm || account?.email || '?'
    return label.slice(0, 2).toUpperCase()
  }

  async function onAvatarSelected(file: File | undefined) {
    if (!userId || !file) return
    if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
      toast.error('Use a JPEG, PNG, or WebP image')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('Image must be 8 MB or smaller')
      return
    }

    setIsUploadingAvatar(true)
    setAvatarUploadProgress(0)
    try {
      const optimized = await optimizeIfImage(file)
      setAvatarUploadProgress(8)
      const uploadFile = new File([optimized.blob], optimized.originalName, {
        type: optimized.mime,
      })
      const result = await uploadUserAvatar(userId, uploadFile, {
        onProgress: (percent) => {
          // Reserve ~8% for optimize, map transfer into 8–100.
          setAvatarUploadProgress(Math.max(8, Math.min(100, Math.round(8 + percent * 0.92))))
        },
      })
      setAvatarUploadProgress(100)
      setAvatarUrl(result.meta.avatarDownloadUrl)
      await remote.refetch()
      toast.success('Photo updated')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not upload photo')
    } finally {
      setIsUploadingAvatar(false)
      setAvatarUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function onRemoveAvatar() {
    if (!userId) return
    setIsRemovingAvatar(true)
    try {
      await clearUserAvatar(userId)
      setAvatarUrl(null)
      await remote.refetch()
      toast.message('Photo removed')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove photo')
    } finally {
      setIsRemovingAvatar(false)
    }
  }

  async function onPasswordSubmit(event: FormEvent) {
    event.preventDefault()

    const parsed = passwordSchema.safeParse(passwordForm)
    if (!parsed.success) {
      const next: Partial<Record<keyof PasswordForm, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'currentPassword' || key === 'newPassword' || key === 'confirmPassword') {
          next[key] = issue.message
        }
      }
      setPasswordErrors(next)
      return
    }

    setIsSavingPassword(true)
    try {
      await changePassword(parsed.data)
      setPasswordForm(EMPTY_PASSWORD_FORM)
      setPasswordErrors({})
      toast.success('Password updated')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update password')
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <AsyncState
      isLoading={remote.isLoading}
      error={remote.isError ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      loadingFallback={<DetailSkeleton />}
    >
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <Card size="sm" className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <p className="text-sm text-muted-foreground">
              {account?.email} · {account?.role}
            </p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_13rem] md:items-start">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={Boolean(fieldErrors.firstName) || undefined}>
                    <Label htmlFor="profile-first-name">First name</Label>
                    <Input
                      id="profile-first-name"
                      value={form.firstName}
                      maxLength={100}
                      placeholder="e.g. Layla"
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
                      placeholder="e.g. Hassan"
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
                      placeholder="Name shown in the app"
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
                      placeholder="+961 03 000 000"
                      aria-invalid={Boolean(fieldErrors.phone) || undefined}
                      onChange={(event) => setField('phone', event.target.value)}
                    />
                    <FieldError errors={[{ message: fieldErrors.phone }]} />
                  </Field>
                </div>

                <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-4 md:sticky md:top-4">
                  <div className="relative size-24 shrink-0">
                    <Avatar size="lg" className="size-24 data-[size=lg]:size-24">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile photo" /> : null}
                      <AvatarFallback className="text-base">{avatarInitials()}</AvatarFallback>
                    </Avatar>
                    {isUploadingAvatar ? (
                      <div
                        className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70"
                        aria-hidden
                      >
                        <Loader2 className="size-6 animate-spin text-primary" />
                      </div>
                    ) : null}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={AVATAR_ACCEPT}
                    className="sr-only"
                    disabled={isUploadingAvatar || isRemovingAvatar}
                    onChange={(event) => void onAvatarSelected(event.target.files?.[0])}
                  />
                  <div className="flex w-full flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={isUploadingAvatar || isRemovingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Camera />
                      )}
                      {isUploadingAvatar
                        ? 'Uploading…'
                        : avatarUrl
                          ? 'Change photo'
                          : 'Upload photo'}
                    </Button>
                    {account?.profile?.avatarUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        disabled={isUploadingAvatar || isRemovingAvatar}
                        onClick={() => void onRemoveAvatar()}
                      >
                        {isRemovingAvatar ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        {isRemovingAvatar ? 'Removing…' : 'Remove'}
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    JPEG, PNG, or WebP · up to 8 MB
                  </p>
                  {isUploadingAvatar ? (
                    <AvatarUploadProgress value={avatarUploadProgress} />
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || isUploadingAvatar}>
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card size="sm" className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <p className="text-sm text-muted-foreground">
              Change your password. You will stay signed in after updating.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => void onPasswordSubmit(event)}
            >
              <Field data-invalid={Boolean(passwordErrors.currentPassword) || undefined}>
                <Label htmlFor="security-current-password">Current password</Label>
                <Input
                  id="security-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  maxLength={128}
                  placeholder="Enter your current password"
                  aria-invalid={Boolean(passwordErrors.currentPassword) || undefined}
                  onChange={(event) => setPasswordField('currentPassword', event.target.value)}
                />
                <FieldError errors={[{ message: passwordErrors.currentPassword }]} />
              </Field>
              <Field data-invalid={Boolean(passwordErrors.newPassword) || undefined}>
                <Label htmlFor="security-new-password">New password</Label>
                <Input
                  id="security-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  maxLength={128}
                  placeholder="At least 8 characters"
                  aria-invalid={Boolean(passwordErrors.newPassword) || undefined}
                  onChange={(event) => setPasswordField('newPassword', event.target.value)}
                />
                <FieldError errors={[{ message: passwordErrors.newPassword }]} />
              </Field>
              <Field data-invalid={Boolean(passwordErrors.confirmPassword) || undefined}>
                <Label htmlFor="security-confirm-password">Confirm new password</Label>
                <Input
                  id="security-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  maxLength={128}
                  placeholder="Re-enter your new password"
                  aria-invalid={Boolean(passwordErrors.confirmPassword) || undefined}
                  onChange={(event) => setPasswordField('confirmPassword', event.target.value)}
                />
                <FieldError errors={[{ message: passwordErrors.confirmPassword }]} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? 'Updating…' : 'Update password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AsyncState>
  )
}
