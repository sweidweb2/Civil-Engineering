import { ProviderListingEditorScreen } from '@/features/provider/ProviderListingEditorScreen'

export default function AdminListingCreate() {
  return <ProviderListingEditorScreen mode="create" basePath="/admin/listings" scope="admin" />
}
