import { useTranslation } from 'react-i18next'

import { API_BASE_URL } from '@/services/api'
import { type Category, localizedCategoryName } from '@/services/categories'
import { useLocaleStore } from '@/stores/localeStore'

type ListingCsvRulesPanelProps = {
  categories: Category[]
  compact?: boolean
}

/** Absolute import URL when possible (helps copy/paste for API clients). */
export function listingImportApiUrl(): string {
  const path = `${API_BASE_URL}/listings/import`
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
  }
  return path
}

export function ListingCsvRulesPanel({ categories, compact = false }: ListingCsvRulesPanelProps) {
  const { t } = useTranslation('admin')
  const locale = useLocaleStore((state) => state.locale)
  const apiUrl = listingImportApiUrl()
  const listingCategories = categories.filter(
    (category) =>
      category.isActive &&
      (category.kind === 'MATERIAL' ||
        category.kind === 'EQUIPMENT' ||
        category.kind === 'SERVICE'),
  )

  const rules = [
    t('listings.import.ruleName'),
    t('listings.import.ruleCategory'),
    t('listings.import.ruleDescription'),
    t('listings.import.ruleBrand'),
    t('listings.import.ruleUnit'),
    t('listings.import.ruleCurrency'),
    t('listings.import.rulePrice'),
    t('listings.import.rulePriceRange'),
    t('listings.import.ruleDecimal'),
    t('listings.import.ruleRental'),
    t('listings.import.ruleQuantity'),
    t('listings.import.ruleStatus'),
    t('listings.import.ruleUnknown'),
    t('listings.import.ruleMaxRows'),
  ]

  return (
    <div className={compact ? 'grid gap-2' : 'grid gap-3'}>
      <div>
        <p className="text-xs font-medium text-foreground">{t('listings.import.rulesTitle')}</p>
        <ul className="mt-1 list-disc space-y-1 ps-4 text-xs text-muted-foreground">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-medium text-foreground">{t('listings.import.apiTitle')}</p>
        <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{apiUrl}</p>
        <ul className="mt-1 list-disc space-y-1 ps-4 text-xs text-muted-foreground">
          <li>{t('listings.import.apiMethod')}</li>
          <li>{t('listings.import.apiAuth')}</li>
          <li>{t('listings.import.apiBody')}</li>
          <li>{t('listings.import.apiProvider')}</li>
        </ul>
      </div>

      <div>
        <p className="text-xs font-medium text-foreground">
          {t('listings.import.categoriesTitle')}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('listings.import.categoriesHint')}
        </p>
        {listingCategories.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('listings.import.categoriesEmpty')}
          </p>
        ) : (
          <ul className="mt-1 max-h-28 list-disc space-y-0.5 overflow-y-auto ps-4 text-xs text-muted-foreground">
            {listingCategories.map((category) => (
              <li key={category.id}>
                {localizedCategoryName(category, locale)}
                {category.slug ? ` · ${category.slug}` : ''}
                {` (${category.kind})`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function buildListingImportRulesText(
  t: (key: string, options?: Record<string, string>) => string,
  categories: Category[],
  locale: 'en' | 'ar',
  apiUrl = listingImportApiUrl(),
): string {
  const listingCategories = categories.filter(
    (category) =>
      category.isActive &&
      (category.kind === 'MATERIAL' ||
        category.kind === 'EQUIPMENT' ||
        category.kind === 'SERVICE'),
  )

  const lines = [
    t('listings.import.rulesTitle'),
    '',
    `- ${t('listings.import.ruleName')}`,
    `- ${t('listings.import.ruleCategory')}`,
    `- ${t('listings.import.ruleDescription')}`,
    `- ${t('listings.import.ruleBrand')}`,
    `- ${t('listings.import.ruleUnit')}`,
    `- ${t('listings.import.ruleCurrency')}`,
    `- ${t('listings.import.rulePrice')}`,
    `- ${t('listings.import.rulePriceRange')}`,
    `- ${t('listings.import.ruleDecimal')}`,
    `- ${t('listings.import.ruleRental')}`,
    `- ${t('listings.import.ruleQuantity')}`,
    `- ${t('listings.import.ruleStatus')}`,
    `- ${t('listings.import.ruleUnknown')}`,
    `- ${t('listings.import.ruleMaxRows')}`,
    '',
    t('listings.import.apiTitle'),
    apiUrl,
    `- ${t('listings.import.apiMethod')}`,
    `- ${t('listings.import.apiAuth')}`,
    `- ${t('listings.import.apiBody')}`,
    `- ${t('listings.import.apiProvider')}`,
    '',
    t('listings.import.categoriesTitle'),
    t('listings.import.categoriesHint'),
    '',
  ]

  if (listingCategories.length === 0) {
    lines.push(t('listings.import.categoriesEmpty'))
  } else {
    for (const category of listingCategories) {
      const label = localizedCategoryName(category, locale)
      lines.push(`- ${label} | slug: ${category.slug} | kind: ${category.kind}`)
    }
  }

  return `${lines.join('\n')}\n`
}
