import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import {
  Award,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileUser,
  ShieldAlert,
  UserRound,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { InlineError } from '@/components/feedback/AsyncState'
import {
  ActionTile,
  DashboardScroll,
  EmptyState,
  HeroMetric,
  MenuGroup,
  MenuRow,
  Notice,
  ProgressBar,
  QuickActions,
  ScreenHeader,
  SectionLabel,
  useTodayCaption,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { cvCompletenessPercent, cvSectionStatuses } from '@/features/worker/cvCompleteness'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys, invalidateWorkerCaches } from '@/lib/cacheKeys'
import { intlLocale } from '@/lib/locale'
import { userFirstName } from '@/lib/user'
import { useToastSuccess } from '@/services/toast'
import {
  getMyWorkerProfile,
  requestWorkerVerification,
  type WorkerProfile,
  type WorkerVerificationStatus,
} from '@/services/workers'
import { useAuthStore } from '@/stores/authStore'
import { MONO_STYLE } from '@/theme/typography'

type WorkerHomeData = {
  profile: WorkerProfile | null
  verificationStatus: WorkerVerificationStatus
}

async function loadHome(): Promise<WorkerHomeData> {
  const { data, meta } = await getMyWorkerProfile()
  return {
    profile: data,
    verificationStatus: meta.verificationStatus,
  }
}

export function WorkerDashboardScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const today = useTodayCaption()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [isRequesting, setIsRequesting] = useState(false)
  const load = useCallback(() => loadHome(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardWorker })
  const profile = remote.status === 'success' ? remote.data.profile : null
  const verification = remote.status === 'success' ? remote.data.verificationStatus : 'UNVERIFIED'
  const percent = cvCompletenessPercent(profile)
  const sections = cvSectionStatuses(profile)
  const doneCount = sections.filter((s) => s.done).length

  async function onRequestVerification() {
    if (isRequesting) return
    setIsRequesting(true)
    try {
      await requestWorkerVerification()
      invalidateWorkerCaches()
      toastSuccess(t('workerHome.requestSent'))
      await remote.refetch({ fresh: true })
    } catch (error) {
      handleApiError(error, t('workerHome.requestFailed'))
    } finally {
      setIsRequesting(false)
    }
  }

  const notice =
    verification === 'VERIFIED'
      ? {
          icon: CheckCircle2,
          tone: 'success' as const,
          title: t('workerHome.verifiedTitle'),
          description: t('workerHome.verifiedDescription'),
          showRequest: false,
        }
      : verification === 'REQUESTED'
        ? {
            icon: Clock,
            tone: 'warning' as const,
            title: t('workerHome.requestedTitle'),
            description: t('workerHome.requestedDescription'),
            showRequest: false,
          }
        : {
            icon: ShieldAlert,
            tone: 'neutral' as const,
            title: t('workerHome.unverifiedTitle'),
            description: t('workerHome.unverifiedDescription'),
            showRequest: true,
          }

  return (
    <View className="flex-1 bg-background" testID="e2e-worker-dashboard">
      <ScreenHeader
        caption={today}
        title={t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
      />

      <DashboardScroll
        refreshing={remote.isFetching && remote.status === 'success'}
        onRefresh={() => void remote.refetch()}
      >
        {remote.status === 'error' ? (
          <InlineError error={remote.error} onRetry={() => void remote.refetch()} />
        ) : null}

        <HeroMetric
          label={t('workerHome.completeness')}
          value={remote.isLoading && !profile ? '…' : `${percent}%`}
          context={t('workerHome.sectionsDone', { done: doneCount, total: sections.length })}
          onPress={() => router.push('/worker/cv' as never)}
        >
          <ProgressBar value={percent} />
        </HeroMetric>

        <Notice
          icon={notice.icon}
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
          action={
            notice.showRequest ? (
              <Button onPress={() => void onRequestVerification()} disabled={isRequesting}>
                {isRequesting ? <ButtonSpinner /> : null}
                <ButtonText>
                  {isRequesting ? t('workerHome.requesting') : t('workerHome.requestVerification')}
                </ButtonText>
              </Button>
            ) : null
          }
        />

        <QuickActions>
          <ActionTile
            icon={FileUser}
            label={t('workerHome.openCv')}
            onPress={() => router.push('/worker/cv' as never)}
          />
          <ActionTile
            icon={Briefcase}
            label={t('workerHome.addExperience')}
            onPress={() => router.push('/worker/cv/experience/new' as never)}
          />
          <ActionTile
            icon={Award}
            label={t('workerHome.editSkills')}
            onPress={() => router.push('/worker/cv/skills' as never)}
          />
          <ActionTile
            icon={UserRound}
            label={t('workerHome.account')}
            onPress={() => router.push('/worker/account' as never)}
          />
        </QuickActions>

        {profile ? (
          <View className="gap-3">
            <SectionLabel>{t('workerHome.yourCv')}</SectionLabel>
            <MenuGroup>
              <MenuRow
                label={profile.headline || profile.primaryTrade || t('workerHome.buildCv')}
                hint={enumLabel(t, 'workerAvailability', profile.availability)}
                onPress={() => router.push('/worker/cv' as never)}
              />
              <MenuRow
                label={t('workerHome.experience')}
                trailing={<Count value={profile.experiences.length} />}
                onPress={() => router.push('/worker/cv/experience' as never)}
              />
              <MenuRow
                label={t('workerHome.skills')}
                trailing={<Count value={profile.skills.length} />}
                last
                onPress={() => router.push('/worker/cv/skills' as never)}
              />
            </MenuGroup>
          </View>
        ) : remote.status === 'success' ? (
          <EmptyState
            icon={ClipboardList}
            title={t('workerHome.emptyTitle')}
            description={t('workerHome.emptyDescription')}
            actionLabel={t('workerHome.openCv')}
            onAction={() => router.push('/worker/cv' as never)}
          />
        ) : null}
      </DashboardScroll>
    </View>
  )
}

function Count({ value }: { value: number }) {
  return (
    <Text className="text-base text-foreground" style={MONO_STYLE}>
      {value.toLocaleString(intlLocale())}
    </Text>
  )
}
