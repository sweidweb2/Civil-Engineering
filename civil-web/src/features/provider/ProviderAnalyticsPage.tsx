import { PageHeader } from '@/components/layout/page-header'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { ProviderAnalyticsSection } from './ProviderAnalyticsSection'

export function ProviderAnalyticsPage() {
  useDocumentTitle('Analytics')

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Analytics"
        description="Catalog performance, listing mix, and recent activity."
      />

      <ProviderAnalyticsSection />
    </div>
  )
}
