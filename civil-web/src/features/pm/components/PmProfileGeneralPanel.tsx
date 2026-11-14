import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import i18n from '@/i18n'
import { optimizeIfImage } from '@/lib/optimizeImage'
import { ApiError } from '@/services/api'
import { changePassword } from '@/services/auth'
import { clearUserAvatar, getUser, updateUser, uploadUserAvatar } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/jpg'
const AVATAR_MAX_BYTES = 8 * 1024 * 1024

function AvatarUploadProgress({ value }: { value: number }) {
  const { t } = useTranslation('pm')
  const label = value >= 100 ? t('uploadFinishing') : t('uploadingPhoto')
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
        aria-label={t('photoUploadProgress')}
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
  firstName: z
    .string()
    .trim()
    .max(100, { error: () => i18n.t('validation:maxLength', { max: 100 }) }),
  lastName: z
    .string()
    .trim()
    .max(100, { error: () => i18n.t('validation:maxLength', { max: 100 }) }),
  displayName: z
    .string()
    .trim()
    .max(120, { error: () => i18n.t('validation:maxLength', { max: 120 }) }),
  phone: z
    .string()
    .trim()
    .max(20, { error: () => i18n.t('validation:maxLength', { max: 20 }) }),
})

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: () => i18n.t('validation:required') })
      .max(128),
    newPassword: z
      .string()
      .min(8, { error: () => i18n.t('validation:passwordMin') })
      .max(128, { error: () => i18n.t('validation:maxLength', { max: 128 }) })
      .regex(/[A-Za-z]/, { error: () => i18n.t('validation:passwordLetter') })
      .regex(/[0-9]/, { error: () => i18n.t('validation:passwordNumber') }),
    confirmPassword: z
      .string()
      .min(1, { error: () => i18n.t('validation:required') })
      .max(128),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: i18n.t('validation:passwordsMismatch'),
        path: ['confirmPassword'],
      })
    }
    if (value.newPassword === value.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        message: i18n.t('validation:passwordDifferent'),
        path: ['newPassword'],
      })
    }
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
  const { t } = useTranslation(['pm', 'common', 'validation'])
  const userId = useAuthStore((state) => state.user?.id)
  const logout = useAuthStore((state) => state.logout)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM)
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<keyof PasswordForm, string>>>(
    {},
  )
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0)
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadProfile = useCallback(() => {
    if (!userId) return Promise.reject(new Error(t('signInToViewProfile')))
    return getUser(userId)
  }, [t, userId])
  const remote = useRemoteData(loadProfile, { queryKey: ['users', 'profile', userId ?? ''] })
  const account = remote.status === 'success' ? remote.data.data : null
  const avatarFromMeta = remote.status === 'success' ? remote.data.meta.avatarDownloadUrl : null

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
    toast.error(t('sessionOutOfDate'))
    void logout()
  }, [logout, remote.error, remote.status, t])

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
      toast.success(t('profileSaved'))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('couldNotSaveProfile'))
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
      toast.error(t('useJpegPngWebp'))
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(t('imageMax8mb'))
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
      toast.success(t('photoUpdated'))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('couldNotUploadPhoto'))
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
      toast.message(t('photoRemoved'))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('couldNotRemovePhoto'))
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
      toast.success(t('passwordUpdated'))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('couldNotUpdatePassword'))
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
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <Card size="sm" className="min-w-0">
          <CardHeader>
            <CardTitle>{t('personalDetails')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {account?.email} · {account?.role}
            </p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
              <Field data-invalid={Boolean(fieldErrors.firstName) || undefined}>
                <Label htmlFor="profile-first-name">{t('firstName')}</Label>
                <Input
                  id="profile-first-name"
                  value={form.firstName}
                  maxLength={100}
                  placeholder={t('placeholderFirstName')}
                  aria-invalid={Boolean(fieldErrors.firstName) || undefined}
                  onChange={(event) => setField('firstName', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.firstName }]} />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.lastName) || undefined}>
                <Label htmlFor="profile-last-name">{t('lastName')}</Label>
                <Input
                  id="profile-last-name"
                  value={form.lastName}
                  maxLength={100}
                  placeholder={t('placeholderLastName')}
                  aria-invalid={Boolean(fieldErrors.lastName) || undefined}
                  onChange={(event) => setField('lastName', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.lastName }]} />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.displayName) || undefined}>
                <Label htmlFor="profile-display-name">{t('displayName')}</Label>
                <Input
                  id="profile-display-name"
                  value={form.displayName}
                  maxLength={120}
                  placeholder={t('placeholderDisplayName')}
                  aria-invalid={Boolean(fieldErrors.displayName) || undefined}
                  onChange={(event) => setField('displayName', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.displayName }]} />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.phone) || undefined}>
                <Label htmlFor="profile-phone">{t('phone')}</Label>
                <Input
                  id="profile-phone"
                  value={form.phone}
                  maxLength={20}
                  placeholder={t('placeholderPhone')}
                  aria-invalid={Boolean(fieldErrors.phone) || undefined}
                  onChange={(event) => setField('phone', event.target.value)}
                />
                <FieldError errors={[{ message: fieldErrors.phone }]} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || isUploadingAvatar}>
                  {isSaving ? t('common:saving') : t('common:save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card size="sm" className="min-w-0">
          <CardHeader>
            <CardTitle>{t('security')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('securityDescription')}</p>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => void onPasswordSubmit(event)}
            >
              <Field data-invalid={Boolean(passwordErrors.currentPassword) || undefined}>
                <Label htmlFor="security-current-password">{t('currentPassword')}</Label>
                <div className="relative">
                  <Input
                    id="security-current-password"
                    type={passwordVisibility.currentPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    maxLength={128}
                    placeholder={t('placeholderCurrentPassword')}
                    aria-invalid={Boolean(passwordErrors.currentPassword) || undefined}
                    className="pe-9"
                    onChange={(event) => setPasswordField('currentPassword', event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-1/2 end-1 -translate-y-1/2 text-muted-foreground"
                    aria-label={
                      passwordVisibility.currentPassword ? t('hidePassword') : t('showPassword')
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
                <Label htmlFor="security-new-password">{t('newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="security-new-password"
                    type={passwordVisibility.newPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    maxLength={128}
                    placeholder={t('placeholderNewPassword')}
                    aria-invalid={Boolean(passwordErrors.newPassword) || undefined}
                    className="pe-9"
                    onChange={(event) => setPasswordField('newPassword', event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-1/2 end-1 -translate-y-1/2 text-muted-foreground"
                    aria-label={
                      passwordVisibility.newPassword ? t('hidePassword') : t('showPassword')
                    }
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
                <Label htmlFor="security-confirm-password">{t('confirmNewPassword')}</Label>
                <div className="relative">
                  <Input
                    id="security-confirm-password"
                    type={passwordVisibility.confirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    maxLength={128}
                    placeholder={t('placeholderConfirmPassword')}
                    aria-invalid={Boolean(passwordErrors.confirmPassword) || undefined}
                    className="pe-9"
                    onChange={(event) => setPasswordField('confirmPassword', event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-1/2 end-1 -translate-y-1/2 text-muted-foreground"
                    aria-label={
                      passwordVisibility.confirmPassword ? t('hidePassword') : t('showPassword')
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
                  {isSavingPassword ? t('common:updating') : t('updatePassword')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card size="sm" className="min-w-0">
          <CardHeader>
            <CardTitle>{t('photo')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('photoHint')}</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="relative size-24 shrink-0">
                <Avatar size="lg" className="size-24 data-[size=lg]:size-24">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={t('photo')} /> : null}
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
                  {isUploadingAvatar ? <Loader2 className="animate-spin" /> : <Camera />}
                  {isUploadingAvatar
                    ? t('uploadingPhoto')
                    : avatarUrl
                      ? t('changePhoto')
                      : t('uploadPhoto')}
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
                    {isRemovingAvatar ? t('common:removing') : t('removePhoto')}
                  </Button>
                ) : null}
              </div>
              {isUploadingAvatar ? <AvatarUploadProgress value={avatarUploadProgress} /> : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AsyncState>
  )
}
