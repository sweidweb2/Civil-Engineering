import { useEffect, useState } from 'react'
import { Building2, MapPin, Phone } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import {
  createProvider,
  listProviderOwnerCandidates,
  type Provider,
  PROVIDER_STATUSES,
  type ProviderOwnerCandidate,
  type ProviderStatus,
  toProviderWriteInput,
  updateProvider,
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
    ownerUserId: provider.ownerUserId ?? '',
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

function formatOwner(candidate: ProviderOwnerCandidate) {
  return candidate.displayName ? `${candidate.displayName} · ${candidate.email}` : candidate.email
}

const STEP_ICONS = [Building2, Phone, MapPin] as const
const STEP_KEYS = ['company', 'contact', 'location'] as const

function isUrl(value: string): boolean {
  try {
    return Boolean(new URL(value.trim()))
  } catch {
    return false
  }
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isCoord(value: string, min: number, max: number): boolean {
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
}

function formIssue(
  form: ProviderFormValues,
  _mode: 'create' | 'edit',
): { step: number; messageKey: string } | null {
  const name = form.name.trim()
  if (!name) return { step: 0, messageKey: 'nameRequired' }
  if (name.length > 120) return { step: 0, messageKey: 'nameMax' }
  if (form.description.length > 2000) {
    return { step: 0, messageKey: 'descriptionMax' }
  }
  if (form.logoUrl.trim() && !isUrl(form.logoUrl)) {
    return { step: 0, messageKey: 'logoUrlInvalid' }
  }
  if (form.phone.trim().length > 20) return { step: 1, messageKey: 'phoneMax' }
  if (form.whatsapp.trim().length > 20) {
    return { step: 1, messageKey: 'whatsappMax' }
  }
  if (form.email.trim() && !isEmail(form.email)) return { step: 1, messageKey: 'emailInvalid' }
  if (form.website.trim() && !isUrl(form.website)) {
    return { step: 1, messageKey: 'websiteInvalid' }
  }
  if (form.address.trim().length > 200) {
    return { step: 2, messageKey: 'addressMax' }
  }
  if (form.city.trim().length > 80) return { step: 2, messageKey: 'cityMax' }
  if (form.country.trim().length > 80) {
    return { step: 2, messageKey: 'countryMax' }
  }
  if (form.lat.trim() && !isCoord(form.lat, -90, 90)) {
    return { step: 2, messageKey: 'latitudeRange' }
  }
  if (form.lng.trim() && !isCoord(form.lng, -180, 180)) {
    return { step: 2, messageKey: 'longitudeRange' }
  }
  return null
}

type ProviderFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  providerId?: string
  initial?: ProviderFormValues
  ownerLabel?: string
  onOpenChange: (open: boolean) => void
  onSaved: (provider: Provider) => void
}

export function ProviderFormDialog({
  open,
  mode,
  providerId,
  initial,
  ownerLabel,
  onOpenChange,
  onSaved,
}: ProviderFormDialogProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [form, setForm] = useState<ProviderFormValues>(EMPTY_PROVIDER_FORM)
  const [candidates, setCandidates] = useState<ProviderOwnerCandidate[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingOwners, setIsLoadingOwners] = useState(false)
  const [step, setStep] = useState(0)

  const statusOptions = PROVIDER_STATUSES.map((status) => ({
    value: status,
    label: t(`admin:providerStatus.${status}`),
  }))

  useEffect(() => {
    if (open) {
      setForm(initial ?? EMPTY_PROVIDER_FORM)
      setStep(0)
    }
  }, [initial, open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setIsLoadingOwners(true)
    void listProviderOwnerCandidates()
      .then((result) => {
        if (!cancelled) setCandidates(result.data)
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof ApiError
              ? error.message
              : t('admin:providers.form.couldNotLoadOwners'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOwners(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, t])

  const ownerOptions =
    form.ownerUserId && !candidates.some((candidate) => candidate.id === form.ownerUserId)
      ? [
          {
            id: form.ownerUserId,
            email: ownerLabel?.includes('@')
              ? (ownerLabel.split('·').pop()?.trim() ?? ownerLabel)
              : ownerLabel || form.ownerUserId,
            displayName: ownerLabel?.includes('·')
              ? ownerLabel.split('·')[0]?.trim() || null
              : ownerLabel && !ownerLabel.includes('@')
                ? ownerLabel
                : null,
          } satisfies ProviderOwnerCandidate,
          ...candidates,
        ]
      : candidates

  async function submit() {
    const issue = formIssue(form, mode)
    if (issue) {
      setStep(issue.step)
      toast.error(t(`admin:providers.form.${issue.messageKey}`))
      return
    }

    const payload = toProviderWriteInput(form)
    setIsSaving(true)
    try {
      const saved =
        mode === 'create'
          ? await createProvider(payload)
          : await updateProvider(providerId ?? '', payload)
      onSaved(saved.data)
      onOpenChange(false)
      toast.message(
        mode === 'create' ? t('admin:providers.form.created') : t('admin:providers.form.updated'),
      )
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t('admin:providers.form.couldNotSave'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('admin:providers.form.createTitle')
              : t('admin:providers.form.editTitle')}
          </DialogTitle>
          <DialogDescription>{t('admin:providers.form.description')}</DialogDescription>
        </DialogHeader>

        <ol className="flex items-start px-4">
          {STEP_KEYS.map((stepKey, index) => {
            const isCurrent = index === step
            const Icon = STEP_ICONS[index]!
            const title = t(`admin:providers.form.steps.${stepKey}`)
            return (
              <li
                key={stepKey}
                className={cn('flex min-w-0 items-start', index < STEP_KEYS.length - 1 && 'flex-1')}
              >
                <button
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => setStep(index)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-300 ease-out',
                      isCurrent
                        ? 'scale-105 border-primary bg-primary text-primary-foreground'
                        : 'scale-100 border-border bg-muted text-muted-foreground hover:bg-accent',
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span
                    className={cn(
                      'text-xs transition-colors duration-300 ease-out',
                      isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {title}
                  </span>
                </button>
                {index < STEP_KEYS.length - 1 ? (
                  <span
                    className={cn(
                      'mt-5 h-px min-w-6 flex-1 transition-colors duration-300 ease-out',
                      step > index ? 'bg-primary' : 'bg-border',
                    )}
                    aria-hidden
                  />
                ) : null}
              </li>
            )
          })}
        </ol>

        <div className="overflow-hidden">
          <div
            className="flex w-full items-start transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${step * 100}%)` }}
          >
            <div className="w-full shrink-0" inert={step !== 0} aria-hidden={step !== 0}>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <FieldLabel
                    htmlFor="provider-owner"
                    label={t('admin:providers.form.owner')}
                    restriction={t('admin:providers.form.ownerOptionalRestriction')}
                  />
                  <Select
                    items={[
                      { value: 'none', label: t('admin:providers.form.noOwner') },
                      ...ownerOptions.map((candidate) => ({
                        value: candidate.id,
                        label: formatOwner(candidate),
                      })),
                    ]}
                    value={form.ownerUserId || 'none'}
                    onValueChange={(value) => {
                      if (!value) return
                      setForm((current) => ({
                        ...current,
                        ownerUserId: value === 'none' ? '' : value,
                      }))
                    }}
                  >
                    <SelectTrigger id="provider-owner" className="w-full">
                      <SelectValue
                        placeholder={
                          isLoadingOwners
                            ? t('admin:providers.form.loadingOwners')
                            : t('admin:providers.form.selectOwner')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('admin:providers.form.noOwner')}</SelectItem>
                      {ownerOptions.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {formatOwner(candidate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isLoadingOwners && ownerOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t('admin:providers.form.noOwners')}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-1.5">
                  <FieldLabel
                    htmlFor="provider-name"
                    label={t('admin:providers.form.name')}
                    restriction={t('admin:providers.form.nameRestriction')}
                  />
                  <Input
                    id="provider-name"
                    maxLength={120}
                    placeholder={t('admin:providers.form.namePlaceholder')}
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>

                <div className="grid gap-1.5">
                  <FieldLabel
                    htmlFor="provider-description"
                    label={t('admin:providers.form.descriptionLabel')}
                    restriction={t('admin:providers.form.descriptionRestriction')}
                  />
                  <Textarea
                    id="provider-description"
                    maxLength={2000}
                    placeholder={t('admin:providers.form.descriptionPlaceholder')}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <FieldLabel
                      htmlFor="provider-status"
                      label={t('admin:providers.form.status')}
                      restriction={t('admin:providers.form.statusRestriction')}
                    />
                    <Select
                      items={statusOptions}
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
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel
                      htmlFor="provider-logo"
                      label={t('admin:providers.form.logoUrl')}
                      restriction={t('admin:providers.form.logoRestriction')}
                    />
                    <Input
                      id="provider-logo"
                      type="url"
                      maxLength={500}
                      placeholder={t('admin:providers.form.logoPlaceholder')}
                      value={form.logoUrl}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, logoUrl: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full shrink-0" inert={step !== 1} aria-hidden={step !== 1}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <FieldLabel
                    htmlFor="provider-phone"
                    label={t('admin:providers.form.phone')}
                    restriction={t('admin:providers.form.phoneRestriction')}
                  />
                  <Input
                    id="provider-phone"
                    maxLength={20}
                    placeholder={t('admin:providers.form.phonePlaceholder')}
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel
                    htmlFor="provider-whatsapp"
                    label={t('admin:providers.form.whatsapp')}
                    restriction={t('admin:providers.form.whatsappRestriction')}
                  />
                  <Input
                    id="provider-whatsapp"
                    maxLength={20}
                    placeholder={t('admin:providers.form.whatsappPlaceholder')}
                    value={form.whatsapp}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, whatsapp: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel
                    htmlFor="provider-email"
                    label={t('admin:providers.form.email')}
                    restriction={t('admin:providers.form.emailRestriction')}
                  />
                  <Input
                    id="provider-email"
                    type="email"
                    maxLength={254}
                    placeholder={t('admin:providers.form.emailPlaceholder')}
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel
                    htmlFor="provider-website"
                    label={t('admin:providers.form.website')}
                    restriction={t('admin:providers.form.websiteRestriction')}
                  />
                  <Input
                    id="provider-website"
                    type="url"
                    maxLength={500}
                    placeholder={t('admin:providers.form.websitePlaceholder')}
                    value={form.website}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, website: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="w-full shrink-0" inert={step !== 2} aria-hidden={step !== 2}>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <FieldLabel
                    htmlFor="provider-address"
                    label={t('admin:providers.form.address')}
                    restriction={t('admin:providers.form.addressRestriction')}
                  />
                  <Input
                    id="provider-address"
                    maxLength={200}
                    placeholder={t('admin:providers.form.addressPlaceholder')}
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, address: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <FieldLabel
                      htmlFor="provider-city"
                      label={t('admin:providers.form.city')}
                      restriction={t('admin:providers.form.cityRestriction')}
                    />
                    <Input
                      id="provider-city"
                      maxLength={80}
                      placeholder={t('admin:providers.form.cityPlaceholder')}
                      value={form.city}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, city: event.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel
                      htmlFor="provider-country"
                      label={t('admin:providers.form.country')}
                      restriction={t('admin:providers.form.countryRestriction')}
                    />
                    <Input
                      id="provider-country"
                      maxLength={80}
                      placeholder={t('admin:providers.form.countryPlaceholder')}
                      value={form.country}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, country: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <FieldLabel
                      htmlFor="provider-lat"
                      label={t('admin:providers.form.latitude')}
                      restriction={t('admin:providers.form.latitudeRestriction')}
                    />
                    <Input
                      id="provider-lat"
                      inputMode="decimal"
                      placeholder={t('admin:providers.form.latitudePlaceholder')}
                      value={form.lat}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, lat: event.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel
                      htmlFor="provider-lng"
                      label={t('admin:providers.form.longitude')}
                      restriction={t('admin:providers.form.longitudeRestriction')}
                    />
                    <Input
                      id="provider-lng"
                      inputMode="decimal"
                      placeholder={t('admin:providers.form.longitudePlaceholder')}
                      value={form.lng}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, lng: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="sm:mr-auto"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              {t('common:back')}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel')}
          </Button>
          {step < STEP_KEYS.length - 1 ? (
            <Button
              type="button"
              onClick={() => setStep((current) => Math.min(STEP_KEYS.length - 1, current + 1))}
            >
              {t('common:next')}
            </Button>
          ) : (
            <Button type="button" onClick={() => void submit()} disabled={isSaving}>
              {isSaving
                ? t('common:saving')
                : mode === 'create'
                  ? t('common:create')
                  : t('common:save')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
