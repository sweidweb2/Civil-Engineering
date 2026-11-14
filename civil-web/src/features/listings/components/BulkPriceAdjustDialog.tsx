import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
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
import { ApiError } from '@/services/api'
import {
  bulkAdjustListingPrices,
  type BulkPriceDirection,
  type BulkPriceMode,
} from '@/services/listings'

type BulkPriceAdjustDialogProps = {
  open: boolean
  providerId: string
  onOpenChange: (open: boolean) => void
  onApplied: () => void
}

const VALUE_PATTERN = /^\d{1,14}(\.\d{1,4})?$/

export function BulkPriceAdjustDialog({
  open,
  providerId,
  onOpenChange,
  onApplied,
}: BulkPriceAdjustDialogProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [direction, setDirection] = useState<BulkPriceDirection>('increase')
  const [mode, setMode] = useState<BulkPriceMode>('percentage')
  const [value, setValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDirection('increase')
    setMode('percentage')
    setValue('')
  }, [open])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!VALUE_PATTERN.test(trimmed) || Number(trimmed) <= 0) {
      toast.error(t('admin:listings.bulkPrice.invalidValue'))
      return
    }
    if (mode === 'percentage' && direction === 'decrease' && Number(trimmed) > 100) {
      toast.error(t('admin:listings.bulkPrice.percentTooHigh'))
      return
    }

    setIsSaving(true)
    try {
      const result = await bulkAdjustListingPrices({
        providerId,
        direction,
        mode,
        value: trimmed,
      })
      toast.message(
        t('admin:listings.bulkPrice.successToast', {
          updated: result.data.updated,
          skipped: result.data.skipped,
        }),
      )
      onOpenChange(false)
      onApplied()
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t('admin:listings.bulkPrice.couldNotApply'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSaving) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>{t('admin:listings.bulkPrice.title')}</DialogTitle>
            <DialogDescription>{t('admin:listings.bulkPrice.description')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bulk-price-direction">
                {t('admin:listings.bulkPrice.direction')}
              </Label>
              <Select
                items={[
                  { value: 'increase', label: t('admin:listings.bulkPrice.increase') },
                  { value: 'decrease', label: t('admin:listings.bulkPrice.decrease') },
                ]}
                value={direction}
                disabled={isSaving}
                onValueChange={(next) => {
                  if (next === 'increase' || next === 'decrease') setDirection(next)
                }}
              >
                <SelectTrigger id="bulk-price-direction" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">{t('admin:listings.bulkPrice.increase')}</SelectItem>
                  <SelectItem value="decrease">{t('admin:listings.bulkPrice.decrease')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bulk-price-mode">{t('admin:listings.bulkPrice.mode')}</Label>
              <Select
                items={[
                  { value: 'percentage', label: t('admin:listings.bulkPrice.percentage') },
                  { value: 'amount', label: t('admin:listings.bulkPrice.amount') },
                ]}
                value={mode}
                disabled={isSaving}
                onValueChange={(next) => {
                  if (next === 'percentage' || next === 'amount') setMode(next)
                }}
              >
                <SelectTrigger id="bulk-price-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    {t('admin:listings.bulkPrice.percentage')}
                  </SelectItem>
                  <SelectItem value="amount">{t('admin:listings.bulkPrice.amount')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bulk-price-value">{t('admin:listings.bulkPrice.value')}</Label>
              <Input
                id="bulk-price-value"
                inputMode="decimal"
                value={value}
                disabled={isSaving}
                onChange={(event) => setValue(event.target.value)}
                placeholder={
                  mode === 'percentage'
                    ? t('admin:listings.bulkPrice.valuePercentPlaceholder')
                    : t('admin:listings.bulkPrice.valueAmountPlaceholder')
                }
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              {t('common:cancel')}
            </Button>
            <Button type="submit" disabled={isSaving || !value.trim()}>
              {isSaving ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {isSaving ? t('common:saving') : t('admin:listings.bulkPrice.apply')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
