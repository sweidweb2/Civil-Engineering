import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { ADMIN_NAV, PanelShell, PM_NAV, PROVIDER_NAV, SUPER_NAV } from './PanelShell'

export function SuperPanelLayout() {
  useDocumentTitle('Super panel')
  return <PanelShell title="Super panel" nav={SUPER_NAV} />
}

export function AdminPanelLayout() {
  useDocumentTitle('Admin panel')
  return <PanelShell title="Admin panel" nav={ADMIN_NAV} />
}

export function PmPanelLayout() {
  useDocumentTitle('PM panel')
  return <PanelShell title="PM panel" nav={PM_NAV} variant="navbar" />
}

export function ProviderPanelLayout() {
  useDocumentTitle('Provider panel')
  return <PanelShell title="Provider panel" nav={PROVIDER_NAV} variant="navbar" />
}
