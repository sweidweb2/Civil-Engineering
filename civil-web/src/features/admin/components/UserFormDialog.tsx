import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/stores/authStore'

import { EMPTY_USER_FORM, isUserRole, USER_ROLE_OPTIONS, type UserFormValues } from '../users.rows'

type UserFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial?: UserFormValues
  onOpenChange: (open: boolean) => void
  onSave: (values: UserFormValues) => Promise<string | null> | string | null
}

function FieldLabel({
  htmlFor,
  label,
  restriction,
}: {
  htmlFor: string
  label: string
  restriction: string
}) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <span className="shrink-0 text-xs text-muted-foreground">{restriction}</span>
    </div>
  )
}

export function UserFormDialog({ open, mode, initial, onOpenChange, onSave }: UserFormDialogProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [form, setForm] = useState<UserFormValues>(EMPTY_USER_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const viewerRole = useAuthStore((state) => state.user?.role)
  const roleOptions = (
    viewerRole === 'SUPER'
      ? USER_ROLE_OPTIONS
      : USER_ROLE_OPTIONS.filter((option) => option.value !== 'SUPER')
  ).map((option) => ({ ...option, label: t(`admin:roles.${option.value}`) }))

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_USER_FORM)
  }, [initial, open])

  async function submit() {
    setIsSaving(true)
    try {
      const error = await onSave(form)
      if (error) {
        toast.error(error)
        return
      }
      onOpenChange(false)
      toast.success(
        mode === 'create' ? t('admin:users.form.created') : t('admin:users.form.updated'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('admin:users.form.createTitle')
              : t('admin:users.form.editTitle')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? t('admin:users.form.createDescription')
              : t('admin:users.form.editDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <FieldLabel
              htmlFor="user-email"
              label={t('admin:users.form.email')}
              restriction={t('admin:users.form.emailRestriction')}
            />
            <Input
              id="user-email"
              type="email"
              maxLength={254}
              placeholder={t('admin:users.form.emailPlaceholder')}
              value={form.email}
              disabled={mode === 'edit'}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </div>
          {mode === 'create' ? (
            <div className="grid gap-1.5">
              <FieldLabel
                htmlFor="user-password"
                label={t('admin:users.form.password')}
                restriction={t('admin:users.form.passwordRestriction')}
              />
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                placeholder={t('admin:users.form.passwordPlaceholder')}
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel
                htmlFor="user-role"
                label={t('admin:users.form.role')}
                restriction={t('admin:users.form.roleRestriction')}
              />
              <Select
                items={roleOptions}
                value={form.role}
                onValueChange={(value) => {
                  if (value && isUserRole(value))
                    setForm((current) => ({ ...current, role: value }))
                }}
              >
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue placeholder={t('admin:users.form.rolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <FieldLabel
                htmlFor="user-status"
                label={t('admin:users.form.status')}
                restriction={t('admin:users.form.statusRestriction')}
              />
              <div className="flex h-8 items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {t(`admin:userStatus.${form.status}`)}
                </span>
                <Switch
                  id="user-status"
                  checked={form.status === 'ACTIVE'}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, status: checked ? 'ACTIVE' : 'INACTIVE' }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel
                htmlFor="user-first-name"
                label={t('admin:users.form.firstName')}
                restriction={t('admin:users.form.optionalMax', { max: 60 })}
              />
              <Input
                id="user-first-name"
                maxLength={60}
                placeholder={t('admin:users.form.firstName')}
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, firstName: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel
                htmlFor="user-last-name"
                label={t('admin:users.form.lastName')}
                restriction={t('admin:users.form.optionalMax', { max: 60 })}
              />
              <Input
                id="user-last-name"
                maxLength={60}
                placeholder={t('admin:users.form.lastName')}
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lastName: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              htmlFor="user-display-name"
              label={t('admin:users.form.displayName')}
              restriction={t('admin:users.form.optionalMax', { max: 80 })}
            />
            <Input
              id="user-display-name"
              maxLength={80}
              placeholder={t('admin:users.form.displayName')}
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({ ...current, displayName: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              htmlFor="user-phone"
              label={t('admin:users.form.phone')}
              restriction={t('admin:users.form.optionalMax', { max: 20 })}
            />
            <Input
              id="user-phone"
              maxLength={20}
              placeholder={t('admin:users.form.phonePlaceholder')}
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('common:cancel')}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={isSaving}>
            {isSaving
              ? t('common:saving')
              : mode === 'create'
                ? t('common:create')
                : t('common:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
