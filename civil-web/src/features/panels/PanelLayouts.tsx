import { useTranslation } from 'react-i18next'

import { ProviderShell } from '@/features/provider/ProviderShell'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { ADMIN_NAV, PanelShell, PM_NAV, SUPER_NAV } from './PanelShell'

export function SuperPanelLayout() {
  const { t } = useTranslation('nav')
  useDocumentTitle(t('superPanel'))
  return <PanelShell titleKey="superPanel" nav={SUPER_NAV} />
}

export function AdminPanelLayout() {
  const { t } = useTranslation('nav')
  useDocumentTitle(t('adminPanel'))
  return <PanelShell titleKey="adminPanel" nav={ADMIN_NAV} />
}

export function PmPanelLayout() {
  const { t } = useTranslation('nav')
  useDocumentTitle(t('pmPanel'))
  return <PanelShell titleKey="pmPanel" nav={PM_NAV} />
}

export function ProviderPanelLayout() {
  const { t } = useTranslation('nav')
  useDocumentTitle(t('providerPanel'))
  return <ProviderShell />
}
