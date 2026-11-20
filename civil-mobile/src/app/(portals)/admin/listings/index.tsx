import { ProviderListingsScreen } from '@/features/provider/ProviderListingsScreen'

export default function AdminListingsRoute() {
  return <ProviderListingsScreen basePath="/admin/listings" scope="admin" backHref="/admin/more" />
}
