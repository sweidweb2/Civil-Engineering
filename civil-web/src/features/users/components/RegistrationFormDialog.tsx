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
import type { ApprovalRole } from '@/services/users'

const ROLE_VALUES: ApprovalRole[] = ['MANAGER', 'PROVIDER', 'WORKER']

export type RegistrationFormValues = {
  email: string
  password: string
  role: ApprovalRole
  firstName: string
  lastName: string
  displayName: string
  phone: string
}

const EMPTY_FORM: RegistrationFormValues = {
  email: '',
  password: '',
  role: 'MANAGER',
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
}

type RegistrationFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: RegistrationFormValues) => Promise<string | null>
}

export function RegistrationFormDialog({
  open,
  onOpenChange,
  onSave,
}: RegistrationFormDialogProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [form, setForm] = useState<RegistrationFormValues>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  const roleOptions = ROLE_VALUES.map((value) => ({
    value,
    label: t(`admin:roles.${value}`),
  }))

  useEffect(() => {
    if (open) setForm(EMPTY_FORM)
  }, [open])

  async function submit() {
    setIsSaving(true)
    try {
      const error = await onSave(form)
      if (error) {
        toast.error(error)
        return
      }
      onOpenChange(false)
      toast.success(t('admin:registrations.form.created'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('admin:registrations.form.title')}</DialogTitle>
          <DialogDescription>{t('admin:registrations.form.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="approval-email">{t('admin:registrations.form.email')}</Label>
            <Input
              id="approval-email"
              type="email"
              maxLength={254}
              placeholder={t('admin:registrations.form.emailPlaceholder')}
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="approval-password">{t('admin:registrations.form.password')}</Label>
            <Input
              id="approval-password"
              type="password"
              autoComplete="new-password"
              placeholder={t('admin:registrations.form.passwordPlaceholder')}
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="approval-role">{t('admin:registrations.form.role')}</Label>
            <Select
              items={roleOptions}
              value={form.role}
              onValueChange={(value) => {
                if (value === 'MANAGER' || value === 'PROVIDER' || value === 'WORKER') {
                  setForm((current) => ({ ...current, role: value }))
                }
              }}
            >
              <SelectTrigger id="approval-role" className="w-full">
                <SelectValue placeholder={t('admin:registrations.form.rolePlaceholder')} />
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="approval-first-name">{t('admin:registrations.form.firstName')}</Label>
              <Input
                id="approval-first-name"
                maxLength={100}
                placeholder={t('admin:registrations.form.firstName')}
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, firstName: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="approval-last-name">{t('admin:registrations.form.lastName')}</Label>
              <Input
                id="approval-last-name"
                maxLength={100}
                placeholder={t('admin:registrations.form.lastName')}
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lastName: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="approval-display-name">
              {t('admin:registrations.form.displayName')}
            </Label>
            <Input
              id="approval-display-name"
              maxLength={120}
              placeholder={t('admin:registrations.form.displayName')}
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({ ...current, displayName: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="approval-phone">{t('admin:registrations.form.phone')}</Label>
            <Input
              id="approval-phone"
              maxLength={20}
              placeholder={t('admin:registrations.form.phonePlaceholder')}
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
            {isSaving ? t('common:creating') : t('common:create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
