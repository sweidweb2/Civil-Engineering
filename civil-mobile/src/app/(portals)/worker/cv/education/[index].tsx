import { useLocalSearchParams } from 'expo-router'

import { WorkerEducationEditorScreen } from '@/features/worker/WorkerEducationEditorScreen'

export default function WorkerEducationEditor() {
  const { index } = useLocalSearchParams<{ index: string }>()
  return <WorkerEducationEditorScreen indexParam={String(index ?? 'new')} />
}
