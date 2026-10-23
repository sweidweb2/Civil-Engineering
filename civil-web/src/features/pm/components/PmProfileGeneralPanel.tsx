import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, Trash2 } from 'lucide-react'
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
import { ApiError } from '@/services/api'
import { changePassword } from '@/services/auth'
import { uploadFile } from '@/services/files'
import {
  clearUserAvatar,
  getUser,
  getUserAvatarUrl,
  setUserAvatar,
  updateUser,
} from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp'
const AVATAR_MAX_BYTES = 8 * 1024 * 1024

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
      .max(128, 'Password must be at most 128 characters'),
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
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadProfile = useCallback(() => {
    if (!userId) return Promise.reject(new Error('Sign in to view your profile'))
    return getUser(userId).then((result) => result.data)
  }, [userId])
  const remote = useRemoteData(loadProfile, { queryKey: ['users', 'profile', userId ?? ''] })
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

  useEffect(() => {
    if (!userId || !account?.profile?.avatarUrl) {
      setAvatarUrl(null)
      return
    }
    let cancelled = false
    void getUserAvatarUrl(userId)
      .then((result) => {
        if (!cancelled) setAvatarUrl(result.data.avatarDownloadUrl)
      })
      .catch(() => {
        if (!cancelled) setAvatarUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [account?.profile?.avatarUrl, userId])

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
    try {
      const uploaded = await uploadFile({
        file,
        entityType: 'USER',
        entityId: userId,
      })
      const result = await setUserAvatar(userId, uploaded.id)
      setAvatarUrl(result.meta.avatarDownloadUrl)
      await remote.refetch()
      toast.success('Photo updated')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not upload photo')
    } finally {
      setIsUploadingAvatar(false)
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
            <CardTitle>Photo</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload a profile photo. Stored privately in Cloudflare R2.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Avatar size="lg" className="size-20 data-[size=lg]:size-20">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile photo" /> : null}
              <AvatarFallback className="text-base">{avatarInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_ACCEPT}
                className="sr-only"
                onChange={(event) => void onAvatarSelected(event.target.files?.[0])}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingAvatar || isRemovingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera />
                  {isUploadingAvatar ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                </Button>
                {account?.profile?.avatarUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isUploadingAvatar || isRemovingAvatar}
                    onClick={() => void onRemoveAvatar()}
                  >
                    <Trash2 />
                    {isRemovingAvatar ? 'Removing…' : 'Remove'}
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · up to 8 MB</p>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
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
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card size="sm">
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
