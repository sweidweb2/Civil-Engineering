import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SettingsPage() {
  const { t } = useTranslation('admin')
  useDocumentTitle(t('settings.documentTitle'))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('settings.title')}
        description={t('settings.description')}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t('settings.platform')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('settings.platformBody')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
