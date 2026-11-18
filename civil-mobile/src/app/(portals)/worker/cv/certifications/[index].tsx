import { useLocalSearchParams } from 'expo-router'

import { WorkerCertificationEditorScreen } from '@/features/worker/WorkerCertificationEditorScreen'

export default function WorkerCertificationEditor() {
  const { index } = useLocalSearchParams<{ index: string }>()
  return <WorkerCertificationEditorScreen indexParam={String(index ?? 'new')} />
}
