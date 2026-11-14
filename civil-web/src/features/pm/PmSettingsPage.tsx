import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { PmProfileAdditionalPanel } from './components/PmProfileAdditionalPanel'
import { PmProfileGeneralPanel } from './components/PmProfileGeneralPanel'

export function PmSettingsPage() {
  const { t } = useTranslation('pm')
  useDocumentTitle(t('settings'))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader className="mb-0" title={t('settings')} description={t('settingsDescription')} />
      <PmProfileGeneralPanel />
      <PmProfileAdditionalPanel />
    </div>
  )
}
