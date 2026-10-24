import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react'
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
  clearProviderLogo,
  getMyProvider,
  uploadProviderLogo,
} from '@/services/providers'
import { getUser, updateUser } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

const LOGO_ACCEPT = 'image/jpeg,image/png,image/webp,image/jpg'
const LOGO_MAX_BYTES = 8 * 1024 * 1024

function UploadProgress({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex w-full flex-col gap-2">
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
        aria-label="Upload progress"
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

export function ProviderMainInfoPanel() {
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
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [hasLogo, setHasLogo] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [logoUploadProgress, setLogoUploadProgress] = useState(0)
  const [isRemovingLogo, setIsRemovingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadUser = useCallback(() => {
    if (!userId) return Promise.reject(new Error('Sign in to view your profile'))
    return getUser(userId)
  }, [userId])
  const userRemote = useRemoteData(loadUser, { queryKey: ['users', 'profile', userId ?? ''] })
  const account = userRemote.status === 'success' ? userRemote.data.data : null

  const loadProvider = useCallback(() => getMyProvider(), [])
  const providerRemote = useRemoteData(loadProvider, {
    queryKey: ['providers', 'me', 'profile'],
  })
  const provider = providerRemote.status === 'success' ? providerRemote.data.data : null
  const logoFromMeta =
    providerRemote.status === 'success' ? providerRemote.data.meta.logoDownloadUrl : null

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
    setLogoUrl(logoFromMeta)
    setHasLogo(Boolean(provider?.logoUrl))
  }, [logoFromMeta, provider?.logoUrl])

  useEffect(() => {
    if (userRemote.status !== 'error') return
    if (!(userRemote.error instanceof ApiError) || userRemote.error.status !== 404) return
    toast.error('Your session is out of date. Please sign in again.')
    void logout()
  }, [logout, userRemote.error, userRemote.status])

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

  async function onLogoSelected(file: File | undefined) {
    if (!provider || !file) return
    if (!LOGO_ACCEPT.split(',').includes(file.type)) {
      toast.error('Use a JPEG, PNG, or WebP image')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('Image must be 8 MB or smaller')
      return
    }

    setIsUploadingLogo(true)
    setLogoUploadProgress(0)
    try {
      const optimized = await optimizeIfImage(file)
      setLogoUploadProgress(8)
      const uploadFile = new File([optimized.blob], optimized.originalName, {
        type: optimized.mime,
      })
      const result = await uploadProviderLogo(provider.id, uploadFile, {
        onProgress: (percent) => {
          setLogoUploadProgress(Math.max(8, Math.min(100, Math.round(8 + percent * 0.92))))
        },
      })
      setLogoUploadProgress(100)
      setLogoUrl(result.meta.logoDownloadUrl)
      setHasLogo(Boolean(result.data.logoUrl))
      await providerRemote.refetch()
      toast.success('Brand image updated')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not upload brand image')
    } finally {
      setIsUploadingLogo(false)
      setLogoUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function onRemoveLogo() {
    if (!provider) return
    setIsRemovingLogo(true)
    try {
      await clearProviderLogo(provider.id)
      setLogoUrl(null)
      setHasLogo(false)
      await providerRemote.refetch()
      toast.message('Brand image removed')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove brand image')
    } finally {
      setIsRemovingLogo(false)
    }
  }

  function brandInitials() {
    const label = provider?.name || form.displayName || account?.email || '?'
    return label.slice(0, 2).toUpperCase()
  }

  const isLoading = userRemote.isLoading || providerRemote.isLoading
  const error = userRemote.isError
    ? userRemote.error
    : providerRemote.isError
      ? providerRemote.error
      : undefined

  return (
    <AsyncState
      isLoading={isLoading}
      error={error}
      onRetry={() => {
        void userRemote.refetch()
        void providerRemote.refetch()
      }}
      loadingFallback={<DetailSkeleton />}
    >
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <Card size="sm" className="min-w-0">
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <p className="text-sm text-muted-foreground">
              {account?.email}
              {provider ? ` · ${provider.name}` : ''}
            </p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
              <Field data-invalid={Boolean(fieldErrors.firstName) || undefined}>
                <Label htmlFor="provider-first-name">First name</Label>
                <Input
                  id="provider-first-name"
                  value={form.firstName}
                  maxLength={100}
                  placeholder="e.g. Layla"
                  aria-invalid={Boolean(fieldErrors.firstName) || undefined}
                  onChange={(event) => setField('firstName', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.firstName }]} />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.lastName) || undefined}>
                <Label htmlFor="provider-last-name">Last name</Label>
                <Input
                  id="provider-last-name"
                  value={form.lastName}
                  maxLength={100}
                  placeholder="e.g. Hassan"
                  aria-invalid={Boolean(fieldErrors.lastName) || undefined}
                  onChange={(event) => setField('lastName', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.lastName }]} />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.displayName) || undefined}>
                <Label htmlFor="provider-display-name">Display name</Label>
                <Input
                  id="provider-display-name"
                  value={form.displayName}
                  maxLength={120}
                  placeholder="Name shown in the app"
                  aria-invalid={Boolean(fieldErrors.displayName) || undefined}
                  onChange={(event) => setField('displayName', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.displayName }]} />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.phone) || undefined}>
                <Label htmlFor="provider-phone">Phone</Label>
                <Input
                  id="provider-phone"
                  value={form.phone}
                  maxLength={20}
                  placeholder="+961 03 000 000"
                  aria-invalid={Boolean(fieldErrors.phone) || undefined}
                  onChange={(event) => setField('phone', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.phone }]} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || isUploadingLogo}>
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card size="sm" className="min-w-0">
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
                <Label htmlFor="provider-current-password">Current password</Label>
                <div className="relative">
                  <Input
                    id="provider-current-password"
                    type={passwordVisibility.currentPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    maxLength={128}
                    placeholder="Enter your current password"
                    aria-invalid={Boolean(passwordErrors.currentPassword) || undefined}
                    className="pr-9"
                    onChange={(event) => setPasswordField('currentPassword', event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                    aria-label={
                      passwordVisibility.currentPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={passwordVisibility.currentPassword}
                    onClick={() =>
                      setPasswordVisibility((current) => ({
                        ...current,
                        currentPassword: !current.currentPassword,
                      }))
                    }
                  >
                    {passwordVisibility.currentPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                <FieldError errors={[{ message: passwordErrors.currentPassword }]} />
              </Field>
              <Field data-invalid={Boolean(passwordErrors.newPassword) || undefined}>
                <Label htmlFor="provider-new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="provider-new-password"
                    type={passwordVisibility.newPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    maxLength={128}
                    placeholder="At least 8 characters"
                    aria-invalid={Boolean(passwordErrors.newPassword) || undefined}
                    className="pr-9"
                    onChange={(event) => setPasswordField('newPassword', event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                    aria-label={passwordVisibility.newPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={passwordVisibility.newPassword}
                    onClick={() =>
                      setPasswordVisibility((current) => ({
                        ...current,
                        newPassword: !current.newPassword,
                      }))
                    }
                  >
                    {passwordVisibility.newPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                <FieldError errors={[{ message: passwordErrors.newPassword }]} />
              </Field>
              <Field data-invalid={Boolean(passwordErrors.confirmPassword) || undefined}>
                <Label htmlFor="provider-confirm-password">Confirm new password</Label>
                <div className="relative">
                  <Input
                    id="provider-confirm-password"
                    type={passwordVisibility.confirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    maxLength={128}
                    placeholder="Re-enter your new password"
                    aria-invalid={Boolean(passwordErrors.confirmPassword) || undefined}
                    className="pr-9"
                    onChange={(event) => setPasswordField('confirmPassword', event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                    aria-label={
                      passwordVisibility.confirmPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={passwordVisibility.confirmPassword}
                    onClick={() =>
                      setPasswordVisibility((current) => ({
                        ...current,
                        confirmPassword: !current.confirmPassword,
                      }))
                    }
                  >
                    {passwordVisibility.confirmPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
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

        <Card size="sm" className="min-w-0">
          <CardHeader>
            <CardTitle>Brand image</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your provider logo · JPEG, PNG, or WebP · up to 8 MB
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="relative size-24 shrink-0">
                <Avatar size="lg" className="size-24 rounded-xl data-[size=lg]:size-24">
                  {logoUrl ? <AvatarImage src={logoUrl} alt="Brand image" className="rounded-xl" /> : null}
                  <AvatarFallback className="rounded-xl text-base">{brandInitials()}</AvatarFallback>
                </Avatar>
                {isUploadingLogo ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70"
                    aria-hidden
                  >
                    <Loader2 className="size-6 animate-spin text-primary" />
                  </div>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={LOGO_ACCEPT}
                className="sr-only"
                disabled={isUploadingLogo || isRemovingLogo || !provider}
                onChange={(event) => void onLogoSelected(event.target.files?.[0])}
              />
              <div className="flex w-full flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isUploadingLogo || isRemovingLogo || !provider}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingLogo ? <Loader2 className="animate-spin" /> : <Camera />}
                  {isUploadingLogo ? 'Uploading…' : hasLogo ? 'Change image' : 'Upload image'}
                </Button>
                {hasLogo ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={isUploadingLogo || isRemovingLogo}
                    onClick={() => void onRemoveLogo()}
                  >
                    {isRemovingLogo ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    {isRemovingLogo ? 'Removing…' : 'Remove'}
                  </Button>
                ) : null}
              </div>
              {isUploadingLogo ? (
                <UploadProgress value={logoUploadProgress} label="Uploading brand image…" />
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AsyncState>
  )
}
