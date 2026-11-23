import { useTranslation } from 'react-i18next'

import { PortalHomeScreen } from '@/features/portals/PortalHomeScreen'

export default function SuperHome() {
  const { t } = useTranslation()
  return <PortalHomeScreen title={t('portals.superLabel')} portalLabel={t('portals.superPanel')} />
}
