import { router } from 'expo-router'
import { BriefcaseBusiness } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { WkGroup, WkRow } from '@/features/worker/ui/kit'
import { WorkerAccountScreen } from '@/features/worker/WorkerAccountScreen'

export default function PmAccount() {
  const { t } = useTranslation()
  return (
    <WorkerAccountScreen
      testID="e2e-pm-account"
      extra={
        <WkGroup>
          <WkRow
            icon={BriefcaseBusiness}
            iconTone="brand"
            title={t('pmProfile.title')}
            subtitle={t('pmProfile.rowSubtitle')}
            onPress={() => router.push('/pm/profile' as never)}
          />
        </WkGroup>
      }
    />
  )
}
