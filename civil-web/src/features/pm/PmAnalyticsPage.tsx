import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { PmAnalyticsDashboard } from './components/PmAnalyticsDashboard'

export function PmAnalyticsPage() {
  const { t } = useTranslation('pm')
  useDocumentTitle(t('analytics'))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader className="mb-0" title={t('analytics')} description={t('analyticsDescription')} />

      <PmAnalyticsDashboard />
    </div>
  )
}
