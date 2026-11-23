import { useLocalSearchParams } from 'expo-router'

import { DesignRequestDetailScreen } from '@/features/design-requests/DesignRequestDetailScreen'

export default function PmDesignRequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <DesignRequestDetailScreen
      id={typeof id === 'string' ? id : (id?.[0] ?? '')}
      basePath="/pm/design-requests"
    />
  )
}
