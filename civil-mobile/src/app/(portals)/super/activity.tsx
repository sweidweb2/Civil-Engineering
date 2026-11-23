import { useTranslation } from 'react-i18next'

import { PortalPlaceholderScreen } from '@/features/portals/PortalPlaceholderScreen'

export default function SuperActivity() {
  const { t } = useTranslation()
  return <PortalPlaceholderScreen title={t('nav.activity')} />
}
