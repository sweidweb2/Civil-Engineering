import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

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
import { Textarea } from '@/components/ui/textarea'
import { type Category, localizedCategoryName } from '@/services/categories'
import { RENTAL_UNITS } from '@/services/listings'
import type { Provider } from '@/services/providers'
import { useLocaleStore } from '@/stores/localeStore'

import type { ListingForm } from '../listings.form'

type Props = {
  form: ListingForm
  onChange: (next: ListingForm) => void
  categories: Category[]
  /** Prefix for input ids so dialog and detail pages don't collide. */
  idPrefix: string
  /** When set, show provider select (create/edit dialog for admins). */
  providers?: Provider[]
  /**
   * Optional media slot (e.g. main image). When set, sits beside the identity
   * text fields so heights line up in the dialog.
   */
  mediaSlot?: ReactNode
  showBrand?: boolean
  showQuantity?: boolean
  showDescription?: boolean
}

export function ListingFields({
  form,
  onChange,
  categories,
  idPrefix,
  providers,
  mediaSlot,
  showBrand = true,
  showQuantity = true,
  showDescription = true,
}: Props) {
  const { t } = useTranslation(['admin', 'common'])
  const locale = useLocaleStore((state) => state.locale)
  const rentalLabel = (unit: string) =>
    t(`admin:listings.form.rentalUnits.${unit}`, { defaultValue: unit })
  const categoryLabel = (category: Category) => localizedCategoryName(category, locale)

  function patch(partial: Partial<ListingForm>) {
    onChange({ ...form, ...partial })
  }

  const identityFields = (
    <div className="grid min-w-0 flex-1 gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>{t('admin:listings.form.name')}</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          maxLength={160}
          onChange={(event) => patch({ name: event.target.value })}
        />
      </div>
      {providers ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-provider`}>{t('admin:listings.form.provider')}</Label>
          <Select
            items={providers.map((provider) => ({
              value: provider.id,
              label: provider.name,
            }))}
            value={form.providerId}
            onValueChange={(value) => {
              if (value) patch({ providerId: value })
            }}
          >
            <SelectTrigger id={`${idPrefix}-provider`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-category`}>{t('admin:listings.form.category')}</Label>
          <Select
            items={categories.map((category) => ({
              value: category.id,
              label: categoryLabel(category),
            }))}
            value={form.categoryId}
            onValueChange={(value) => {
              if (value) patch({ categoryId: value })
            }}
          >
            <SelectTrigger id={`${idPrefix}-category`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {categoryLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-status`}>{t('admin:listings.form.status')}</Label>
          <Select
            items={[
              { value: 'ACTIVE', label: t('admin:listingStatus.ACTIVE') },
              { value: 'INACTIVE', label: t('admin:listingStatus.INACTIVE') },
            ]}
            value={form.status}
            onValueChange={(value) => {
              if (value === 'ACTIVE' || value === 'INACTIVE') patch({ status: value })
            }}
          >
            <SelectTrigger id={`${idPrefix}-status`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">{t('admin:listingStatus.ACTIVE')}</SelectItem>
              <SelectItem value="INACTIVE">{t('admin:listingStatus.INACTIVE')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  return (
    <div className="grid gap-3">
      {mediaSlot ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {identityFields}
          <div className="flex shrink-0 sm:w-32">{mediaSlot}</div>
        </div>
      ) : (
        identityFields
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-currency`}>{t('admin:listings.form.currency')}</Label>
          <Input
            id={`${idPrefix}-currency`}
            value={form.currency}
            maxLength={3}
            onChange={(event) => patch({ currency: event.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-unit`}>{t('admin:listings.form.unit')}</Label>
          <Input
            id={`${idPrefix}-unit`}
            value={form.unit}
            maxLength={40}
            onChange={(event) => patch({ unit: event.target.value })}
          />
        </div>
        {showBrand ? (
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-brand`}>{t('admin:listings.form.brand')}</Label>
            <Input
              id={`${idPrefix}-brand`}
              value={form.brand}
              maxLength={120}
              onChange={(event) => patch({ brand: event.target.value })}
            />
          </div>
        ) : null}
        {showQuantity ? (
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-qty`}>{t('admin:listings.form.quantity')}</Label>
            <Input
              id={`${idPrefix}-qty`}
              inputMode="decimal"
              maxLength={18}
              value={form.quantityAvailable}
              onChange={(event) => patch({ quantityAvailable: event.target.value })}
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
        <Label htmlFor={`${idPrefix}-price-range`}>{t('admin:listings.form.priceRange')}</Label>
        <Switch
          id={`${idPrefix}-price-range`}
          checked={form.hasPriceRange}
          onCheckedChange={(checked) =>
            patch({
              hasPriceRange: checked,
              price: checked ? '' : form.price,
              priceMin: checked ? form.priceMin : '',
              priceMax: checked ? form.priceMax : '',
            })
          }
        />
      </div>
      {form.hasPriceRange ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-price-min`}>{t('admin:listings.form.minPrice')}</Label>
            <Input
              id={`${idPrefix}-price-min`}
              inputMode="decimal"
              maxLength={18}
              value={form.priceMin}
              onChange={(event) => patch({ priceMin: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-price-max`}>{t('admin:listings.form.maxPrice')}</Label>
            <Input
              id={`${idPrefix}-price-max`}
              inputMode="decimal"
              maxLength={18}
              value={form.priceMax}
              onChange={(event) => patch({ priceMax: event.target.value })}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-price`}>{t('admin:listings.form.price')}</Label>
          <Input
            id={`${idPrefix}-price`}
            inputMode="decimal"
            maxLength={18}
            value={form.price}
            onChange={(event) => patch({ price: event.target.value })}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
        <Label htmlFor={`${idPrefix}-for-rent`}>{t('admin:listings.form.availableForRent')}</Label>
        <Switch
          id={`${idPrefix}-for-rent`}
          checked={form.isForRent}
          onCheckedChange={(checked) =>
            patch({
              isForRent: checked,
              rentalPrice: checked ? form.rentalPrice : '',
              rentalUnit: checked ? form.rentalUnit : '',
            })
          }
        />
      </div>
      {form.isForRent ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-rental-price`}>
              {t('admin:listings.form.rentalPrice')}
            </Label>
            <Input
              id={`${idPrefix}-rental-price`}
              value={form.rentalPrice}
              onChange={(event) => patch({ rentalPrice: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-rental-unit`}>{t('admin:listings.form.rentalUnit')}</Label>
            <Select
              items={RENTAL_UNITS.map((unit) => ({
                value: unit,
                label: rentalLabel(unit),
              }))}
              value={form.rentalUnit || undefined}
              onValueChange={(value) => patch({ rentalUnit: value ?? '' })}
            >
              <SelectTrigger id={`${idPrefix}-rental-unit`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RENTAL_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {rentalLabel(unit)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {showDescription ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-description`}>
            {t('admin:listings.form.descriptionLabel')}
          </Label>
          <Textarea
            id={`${idPrefix}-description`}
            rows={4}
            value={form.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  )
}
