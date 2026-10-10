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
import type { ApprovalRole } from '@/services/users'

const ROLES: Array<{ value: ApprovalRole; label: string }> = [
  { value: 'MANAGER', label: 'Project manager' },
  { value: 'PROVIDER', label: 'Provider' },
  { value: 'WORKER', label: 'Worker' },
]

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

export function RegistrationFormDialog({ open, onOpenChange, onSave }: RegistrationFormDialogProps) {
  const [form, setForm] = useState<RegistrationFormValues>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

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
      toast.success('Registration created')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New registration</DialogTitle>
          <DialogDescription>
            Creates a project manager, provider, or worker account as pending. They cannot sign in until approved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="approval-email">Email</Label>
            <Input
              id="approval-email"
              type="email"
              maxLength={254}
              placeholder="name@example.com"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="approval-password">Password</Label>
            <Input
              id="approval-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="approval-role">Role</Label>
            <Select
              items={ROLES}
              value={form.role}
              onValueChange={(value) => {
                if (value === 'MANAGER' || value === 'PROVIDER' || value === 'WORKER') {
                  setForm((current) => ({ ...current, role: value }))
                }
              }}
            >
              <SelectTrigger id="approval-role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="approval-first-name">First name</Label>
              <Input
                id="approval-first-name"
                maxLength={100}
                placeholder="First name"
                value={form.firstName}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="approval-last-name">Last name</Label>
              <Input
                id="approval-last-name"
                maxLength={100}
                placeholder="Last name"
                value={form.lastName}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="approval-display-name">Display name</Label>
            <Input
              id="approval-display-name"
              maxLength={120}
              placeholder="Display name"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({ ...current, displayName: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="approval-phone">Phone</Label>
            <Input
              id="approval-phone"
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
            {isSaving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
