import { useEffect, useState } from 'react'
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

import {
  EMPTY_USER_FORM,
  isUserRole,
  USER_ROLE_OPTIONS,
  type UserFormValues,
} from '../usersStore'

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
  const [form, setForm] = useState<UserFormValues>(EMPTY_USER_FORM)
  const [isSaving, setIsSaving] = useState(false)

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
      toast.success(mode === 'create' ? 'User created' : 'User updated')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create user' : 'Edit user'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Creates a real account via the API. Password is required.'
              : 'Updates role, status, and profile fields. Email cannot be changed here.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <FieldLabel htmlFor="user-email" label="Email" restriction="required · unique" />
            <Input
              id="user-email"
              type="email"
              maxLength={254}
              placeholder="name@example.com"
              value={form.email}
              disabled={mode === 'edit'}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          {mode === 'create' ? (
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="user-password" label="Password" restriction="required · min 8" />
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter a password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="user-role" label="Role" restriction="required" />
              <Select
                items={USER_ROLE_OPTIONS}
                value={form.role}
                onValueChange={(value) => {
                  if (value && isUserRole(value)) setForm((current) => ({ ...current, role: value }))
                }}
              >
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="user-status" label="Status" restriction="required" />
              <div className="flex h-8 items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {form.status === 'ACTIVE' ? 'Active' : form.status === 'PENDING' ? 'Pending' : 'Inactive'}
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
              <FieldLabel htmlFor="user-first-name" label="First name" restriction="optional · max 60" />
              <Input
                id="user-first-name"
                maxLength={60}
                placeholder="First name"
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, firstName: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="user-last-name" label="Last name" restriction="optional · max 60" />
              <Input
                id="user-last-name"
                maxLength={60}
                placeholder="Last name"
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lastName: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel htmlFor="user-display-name" label="Display name" restriction="optional · max 80" />
            <Input
              id="user-display-name"
              maxLength={80}
              placeholder="Display name"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({ ...current, displayName: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel htmlFor="user-phone" label="Phone" restriction="optional · max 20" />
            <Input
              id="user-phone"
              maxLength={20}
              placeholder="+961 70 000 000"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={isSaving}>
            {isSaving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
