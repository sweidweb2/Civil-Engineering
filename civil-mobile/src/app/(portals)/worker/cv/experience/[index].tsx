import { useLocalSearchParams } from 'expo-router'

import { WorkerExperienceEditorScreen } from '@/features/worker/WorkerExperienceEditorScreen'

export default function WorkerExperienceEditor() {
  const { index } = useLocalSearchParams<{ index: string }>()
  return <WorkerExperienceEditorScreen indexParam={String(index ?? 'new')} />
}
