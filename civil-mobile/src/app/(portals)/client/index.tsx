import { useTranslation } from 'react-i18next'

import { PortalHomeScreen } from '@/features/portals/PortalHomeScreen'

/** Guest/client portal — landing only for now. */
export default function ClientHome() {
  const { t } = useTranslation()
  return <PortalHomeScreen title={t('portals.home')} portalLabel={t('portals.clientLabel')} />
}
