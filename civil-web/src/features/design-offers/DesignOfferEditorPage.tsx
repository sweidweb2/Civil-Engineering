import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import {
  createDesignOffer,
  deleteDesignOffer,
  getDesignOffer,
  updateDesignOffer,
  uploadDesignOfferImage,
} from '@/services/design-offers'

export function DesignOfferEditorPage({ mode }: { mode: 'create' | 'edit' }) {
  const { t } = useTranslation(['designOffers', 'common'])
  const { id = '' } = useParams()
  const navigate = useNavigate()
  useDocumentTitle(
    mode === 'create' ? t('designOffers:documentTitleNew') : t('designOffers:documentTitleEdit'),
  )

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceStart, setPriceStart] = useState('')
  const [priceEnd, setPriceEnd] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const remote = useRemoteData(() => getDesignOffer(id), {
    enabled: mode === 'edit' && Boolean(id),
    queryKey: ['design-offers', 'detail', id],
  })

  useEffect(() => {
    if (remote.status !== 'success') return
    const offer = remote.data
    setTitle(offer.title)
    setDescription(offer.description)
    setPriceStart(offer.priceStart)
    setPriceEnd(offer.priceEnd)
    setCurrency(offer.currency)
    setSortOrder(String(offer.sortOrder))
    setIsActive(offer.isActive)
    setImageUrl(offer.imageUrl)
  }, [remote])

  const schema = useMemo(
    () =>
      z
        .object({
          title: z.string().trim().min(1),
          description: z.string().trim().min(1),
          priceStart: z
            .string()
            .trim()
            .regex(/^\d+(\.\d{1,4})?$/),
          priceEnd: z
            .string()
            .trim()
            .regex(/^\d+(\.\d{1,4})?$/),
          currency: z.string().trim().min(1).max(8),
        })
        .refine((v) => Number(v.priceStart) <= Number(v.priceEnd), {
          message: 'range',
          path: ['priceEnd'],
        }),
    [],
  )

  const submit = async () => {
    const parsed = schema.safeParse({ title, description, priceStart, priceEnd, currency })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (key && !next[key]) next[key] = issue.message
      }
      setFieldErrors(next)
      return
    }
    setFieldErrors({})
    setIsSaving(true)
    try {
      const payload = {
        ...parsed.data,
        currency: parsed.data.currency.toUpperCase(),
        isActive,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      }
      let saved =
        mode === 'create' ? await createDesignOffer(payload) : await updateDesignOffer(id, payload)
      if (imageFile) {
        saved = await uploadDesignOfferImage(saved.id, imageFile)
      }
      toast.success(mode === 'create' ? t('designOffers:created') : t('designOffers:saved'))
      navigate(`/admin/design-offers/${saved.id}`)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('designOffers:couldNotSave'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(t('designOffers:confirmDelete'))) return
    try {
      await deleteDesignOffer(id)
      toast.success(t('designOffers:deleted'))
      navigate('/admin/design-offers')
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('designOffers:couldNotDelete'),
      )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          mode === 'create'
            ? t('designOffers:documentTitleNew')
            : t('designOffers:documentTitleEdit')
        }
        actions={
          <Link to="/admin/design-offers" className={cn(buttonVariants({ variant: 'outline' }))}>
            {t('designOffers:backToList')}
          </Link>
        }
      />

      <AsyncState
        isLoading={mode === 'edit' && remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailSkeleton />}
      >
        <div className="grid max-w-2xl gap-4">
          <Field>
            <Label>{t('designOffers:fields.image')}</Label>
            {(imageFile || imageUrl) && (
              <img
                src={imageFile ? URL.createObjectURL(imageFile) : imageUrl!}
                alt=""
                className="mb-2 h-40 w-full rounded-lg object-cover"
              />
            )}
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field>
            <Label htmlFor="offer-title">{t('designOffers:fields.title')}</Label>
            <Input
              id="offer-title"
              value={title}
              placeholder={t('designOffers:placeholders.title')}
              onChange={(e) => setTitle(e.target.value)}
            />
            {fieldErrors.title ? (
              <p className="text-sm text-destructive">{fieldErrors.title}</p>
            ) : null}
          </Field>
          <Field>
            <Label htmlFor="offer-desc">{t('designOffers:fields.description')}</Label>
            <Textarea
              id="offer-desc"
              rows={4}
              value={description}
              placeholder={t('designOffers:placeholders.description')}
              onChange={(e) => setDescription(e.target.value)}
            />
            {fieldErrors.description ? (
              <p className="text-sm text-destructive">{fieldErrors.description}</p>
            ) : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="offer-start">{t('designOffers:fields.priceStart')}</Label>
              <Input
                id="offer-start"
                value={priceStart}
                onChange={(e) => setPriceStart(e.target.value)}
              />
              {fieldErrors.priceStart ? (
                <p className="text-sm text-destructive">{fieldErrors.priceStart}</p>
              ) : null}
            </Field>
            <Field>
              <Label htmlFor="offer-end">{t('designOffers:fields.priceEnd')}</Label>
              <Input
                id="offer-end"
                value={priceEnd}
                onChange={(e) => setPriceEnd(e.target.value)}
              />
              {fieldErrors.priceEnd ? (
                <p className="text-sm text-destructive">{fieldErrors.priceEnd}</p>
              ) : null}
            </Field>
          </div>
          <Field>
            <Label htmlFor="offer-currency">{t('designOffers:fields.currency')}</Label>
            <Input
              id="offer-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              maxLength={8}
            />
          </Field>
          <Field>
            <Label htmlFor="offer-sort">{t('designOffers:fields.sortOrder')}</Label>
            <Input
              id="offer-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </Field>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t('designOffers:fields.active')}</p>
              <p className="text-sm text-muted-foreground">{t('designOffers:activeHint')}</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={isSaving} onClick={() => void submit()}>
              {isSaving
                ? t('common:saving')
                : mode === 'create'
                  ? t('designOffers:create')
                  : t('designOffers:save')}
            </Button>
            {mode === 'edit' ? (
              <Button variant="destructive" onClick={() => void remove()}>
                {t('designOffers:delete')}
              </Button>
            ) : null}
          </div>
        </div>
      </AsyncState>
    </div>
  )
}
