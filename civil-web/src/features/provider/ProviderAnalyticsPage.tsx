import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { ProviderAnalyticsSection } from './ProviderAnalyticsSection'

export function ProviderAnalyticsPage() {
  const { t } = useTranslation('provider')
  useDocumentTitle(t('analytics.title'))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('analytics.title')}
        description={t('analytics.description')}
      />

      <ProviderAnalyticsSection />
    </div>
  )
}
