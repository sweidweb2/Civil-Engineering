import { Trans, useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuthStore } from '@/stores/authStore'

type PanelHomeProps = {
  variant: 'super'
}

export function PanelHomePage({ variant }: PanelHomeProps) {
  const { t } = useTranslation(['admin', 'common'])
  const title = t(`admin:panelHome.${variant}.title`)
  const description = t(`admin:panelHome.${variant}.description`)
  useDocumentTitle(title)
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader className="mb-0" title={title} description={description} />
      {user ? (
        <Card size="sm" className="min-w-0">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <Trans
                i18nKey="common:signedInAs"
                values={{ email: user.email }}
                components={{ strong: <span className="font-medium text-foreground" /> }}
              />{' '}
              ({t(`admin:roles.${user.role}`)})
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
