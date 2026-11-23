import { DesignRequestsListScreen } from '@/features/design-requests/DesignRequestsListScreen'

export default function AdminDesignRequests() {
  return (
    <DesignRequestsListScreen basePath="/admin/design-requests" backHref="/admin/more" isAdmin />
  )
}
