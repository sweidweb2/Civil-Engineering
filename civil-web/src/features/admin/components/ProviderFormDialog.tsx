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
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/services/api'
import {
  createProvider,
  listProviderOwnerCandidates,
  PROVIDER_STATUSES,
  toProviderWriteInput,
  updateProvider,
  type Provider,
  type ProviderOwnerCandidate,
  type ProviderStatus,
} from '@/services/providers'

export type ProviderFormValues = {
  ownerUserId: string
  name: string
  description: string
  logoUrl: string
  phone: string
  whatsapp: string
  email: string
  website: string
  address: string
  city: string
  country: string
  lat: string
  lng: string
  status: ProviderStatus
}

export const EMPTY_PROVIDER_FORM: ProviderFormValues = {
  ownerUserId: '',
  name: '',
  description: '',
  logoUrl: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  address: '',
  city: '',
  country: '',
  lat: '',
  lng: '',
  status: 'PENDING',
}

export function formFromProvider(provider: Provider): ProviderFormValues {
  return {
    ownerUserId: provider.ownerUserId,
    name: provider.name,
    description: provider.description ?? '',
    logoUrl: provider.logoUrl ?? '',
    phone: provider.phone ?? '',
    whatsapp: provider.whatsapp ?? '',
    email: provider.email ?? '',
    website: provider.website ?? '',
    address: provider.address ?? '',
    city: provider.city ?? '',
    country: provider.country ?? '',
    lat: provider.lat == null ? '' : String(provider.lat),
    lng: provider.lng == null ? '' : String(provider.lng),
    status: provider.status,
  }
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

function ownerLabel(candidate: ProviderOwnerCandidate) {
  return candidate.displayName ? `${candidate.displayName} · ${candidate.email}` : candidate.email
}

type ProviderFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  providerId?: string
  initial?: ProviderFormValues
  ownerEmail?: string
  onOpenChange: (open: boolean) => void
  onSaved: (provider: Provider) => void
}

export function ProviderFormDialog({
  open,
  mode,
  providerId,
  initial,
  ownerEmail,
  onOpenChange,
  onSaved,
}: ProviderFormDialogProps) {
  const [form, setForm] = useState<ProviderFormValues>(EMPTY_PROVIDER_FORM)
  const [candidates, setCandidates] = useState<ProviderOwnerCandidate[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingOwners, setIsLoadingOwners] = useState(false)

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_PROVIDER_FORM)
  }, [initial, open])

  useEffect(() => {
    if (!open || mode !== 'create') return
    let cancelled = false
    setIsLoadingOwners(true)
    void listProviderOwnerCandidates()
      .then((result) => {
        if (!cancelled) setCandidates(result.data)
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof ApiError ? error.message : 'Could not load provider owners')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOwners(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, open])

  async function submit() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (mode === 'create' && !form.ownerUserId.trim()) {
      toast.error('Owner is required')
      return
    }

    const payload = toProviderWriteInput(form, mode)
    setIsSaving(true)
    try {
      const saved =
        mode === 'create'
          ? await createProvider(payload)
          : await updateProvider(providerId ?? '', payload)
      onSaved(saved)
      onOpenChange(false)
      toast.message(mode === 'create' ? 'Provider created' : 'Provider updated')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save provider')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create provider' : 'Edit provider'}</DialogTitle>
          <DialogDescription>
            One company per provider owner. Invisible in the marketplace until approved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {mode === 'create' ? (
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-owner" label="Owner" restriction="required · PROVIDER user" />
              <Select
                value={form.ownerUserId || undefined}
                onValueChange={(value) => {
                  if (value) setForm((current) => ({ ...current, ownerUserId: value }))
                }}
              >
                <SelectTrigger id="provider-owner" className="w-full">
                  <SelectValue
                    placeholder={isLoadingOwners ? 'Loading owners…' : 'Select a provider owner'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {ownerLabel(candidate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isLoadingOwners && candidates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No unused PROVIDER users. Create a provider-role user first.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-owner-email" label="Owner" restriction="locked" />
              <Input id="provider-owner-email" value={ownerEmail ?? form.ownerUserId} disabled />
            </div>
          )}

          <div className="grid gap-1.5">
            <FieldLabel htmlFor="provider-name" label="Name" restriction="required · max 120" />
            <Input
              id="provider-name"
              maxLength={120}
              placeholder="Company name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>

          <div className="grid gap-1.5">
            <FieldLabel htmlFor="provider-description" label="Description" restriction="optional · max 2000" />
            <Textarea
              id="provider-description"
              maxLength={2000}
              placeholder="What this company supplies"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-status" label="Status" restriction="admin" />
              <Select
                value={form.status}
                onValueChange={(value) => {
                  if (value) {
                    setForm((current) => ({ ...current, status: value as ProviderStatus }))
                  }
                }}
              >
                <SelectTrigger id="provider-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-logo" label="Logo URL" restriction="optional · URL" />
              <Input
                id="provider-logo"
                type="url"
                maxLength={500}
                placeholder="https://…"
                value={form.logoUrl}
                onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-phone" label="Phone" restriction="optional · max 20" />
              <Input
                id="provider-phone"
                maxLength={20}
                placeholder="+961 01 555 010"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-whatsapp" label="WhatsApp" restriction="optional · max 20" />
              <Input
                id="provider-whatsapp"
                maxLength={20}
                placeholder="+961 70 000 000"
                value={form.whatsapp}
                onChange={(event) =>
                  setForm((current) => ({ ...current, whatsapp: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-email" label="Email" restriction="optional · contact" />
              <Input
                id="provider-email"
                type="email"
                maxLength={254}
                placeholder="shop@example.com"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-website" label="Website" restriction="optional · URL" />
              <Input
                id="provider-website"
                type="url"
                maxLength={500}
                placeholder="https://…"
                value={form.website}
                onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <FieldLabel htmlFor="provider-address" label="Address" restriction="optional · max 200" />
            <Input
              id="provider-address"
              maxLength={200}
              placeholder="Street, building"
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-city" label="City" restriction="optional · search" />
              <Input
                id="provider-city"
                maxLength={80}
                placeholder="Beirut"
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-country" label="Country" restriction="optional · search" />
              <Input
                id="provider-country"
                maxLength={80}
                placeholder="Lebanon"
                value={form.country}
                onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-lat" label="Latitude" restriction="optional · −90–90" />
              <Input
                id="provider-lat"
                inputMode="decimal"
                placeholder="33.8938"
                value={form.lat}
                onChange={(event) => setForm((current) => ({ ...current, lat: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="provider-lng" label="Longitude" restriction="optional · −180–180" />
              <Input
                id="provider-lng"
                inputMode="decimal"
                placeholder="35.5018"
                value={form.lng}
                onChange={(event) => setForm((current) => ({ ...current, lng: event.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
