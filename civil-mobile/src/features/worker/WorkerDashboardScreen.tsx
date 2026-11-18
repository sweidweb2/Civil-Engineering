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

import {
  ActionTile,
  Card,
  DashboardScroll,
  HeroCard,
  IconTile,
  ProgressBar,
  ScreenHeader,
  SectionLabel,
  StatusPill,
  toneForStatus,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { cvCompletenessPercent, cvSectionStatuses } from '@/features/worker/cvCompleteness'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys, invalidateWorkerCaches } from '@/lib/cacheKeys'
import { userFirstName } from '@/lib/user'
import { useToastSuccess } from '@/services/toast'
import {
  getMyWorkerProfile,
  requestWorkerVerification,
  type WorkerProfile,
  type WorkerVerificationStatus,
} from '@/services/workers'
import { useAuthStore } from '@/stores/authStore'

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

  const banner =
    verification === 'VERIFIED'
      ? {
          icon: CheckCircle2,
          tone: 'success' as const,
          title: t('workerHome.verifiedTitle'),
          description: t('workerHome.verifiedDescription'),
          boxClass: 'border-success/30 bg-success/10',
          textClass: 'text-success',
          showRequest: false,
        }
      : verification === 'REQUESTED'
        ? {
            icon: Clock,
            tone: 'warning' as const,
            title: t('workerHome.requestedTitle'),
            description: t('workerHome.requestedDescription'),
            boxClass: 'border-warning/30 bg-warning/10',
            textClass: 'text-warning',
            showRequest: false,
          }
        : {
            icon: ShieldAlert,
            tone: 'info' as const,
            title: t('workerHome.unverifiedTitle'),
            description: t('workerHome.unverifiedDescription'),
            boxClass: 'border-border bg-muted/40',
            textClass: 'text-foreground',
            showRequest: true,
          }

  return (
    <View className="flex-1 bg-background" testID="e2e-worker-dashboard">
      <ScreenHeader
        title={t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
      />

      <DashboardScroll
        refreshing={remote.isFetching && remote.status === 'success'}
        onRefresh={() => void remote.refetch()}
      >
        <HeroCard
          icon={FileUser}
          caption={t('workerHome.completeness')}
          value={`${percent}%`}
          onPress={() => router.push('/worker/cv' as never)}
          stats={[
            {
              label: t('workerHome.experience'),
              value: String(profile?.experiences.length ?? 0),
              onPress: () => router.push('/worker/cv/experience' as never),
            },
            {
              label: t('workerHome.skills'),
              value: String(profile?.skills.length ?? 0),
              onPress: () => router.push('/worker/cv/skills' as never),
            },
          ]}
        />

        <View className={`gap-3 rounded-2xl border p-4 ${banner.boxClass}`}>
          <View className="flex-row items-center gap-4">
            <IconTile icon={banner.icon} tone={banner.tone} size={44} />
            <View className="min-w-0 flex-1 gap-1">
              <Text className={`text-base font-bold ${banner.textClass}`}>{banner.title}</Text>
              <Text className="text-sm leading-5 text-muted-foreground">{banner.description}</Text>
            </View>
          </View>
          {banner.showRequest ? (
            <Button onPress={() => void onRequestVerification()} disabled={isRequesting}>
              {isRequesting ? <ButtonSpinner /> : null}
              <ButtonText>
                {isRequesting ? t('workerHome.requesting') : t('workerHome.requestVerification')}
              </ButtonText>
            </Button>
          ) : null}
        </View>

        <View className="gap-3">
          <SectionLabel>{t('workerHome.yourCv')}</SectionLabel>
          <Card>
            <View className="gap-4 p-1">
              <View className="flex-row items-center justify-between gap-3">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                    {profile?.headline || profile?.primaryTrade || t('workerHome.buildCv')}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {t('workerHome.sectionsDone', { done: doneCount, total: sections.length })}
                  </Text>
                </View>
                {profile ? (
                  <StatusPill
                    label={enumLabel(t, 'workerAvailability', profile.availability)}
                    tone={toneForStatus(profile.availability)}
                  />
                ) : null}
              </View>
              <ProgressBar value={percent} />
            </View>
          </Card>
        </View>

        <View className="gap-3">
          <SectionLabel>{t('workerHome.quickActions')}</SectionLabel>
          <Card>
            <View className="flex-row justify-between">
              <ActionTile
                icon={FileUser}
                label={t('workerHome.openCv')}
                onPress={() => router.push('/worker/cv' as never)}
              />
              <ActionTile
                icon={Briefcase}
                tone="success"
                label={t('workerHome.addExperience')}
                onPress={() => router.push('/worker/cv/experience/new' as never)}
              />
              <ActionTile
                icon={Award}
                tone="info"
                label={t('workerHome.editSkills')}
                onPress={() => router.push('/worker/cv/skills' as never)}
              />
              <ActionTile
                icon={UserRound}
                tone="neutral"
                label={t('workerHome.account')}
                onPress={() => router.push('/worker/account' as never)}
              />
            </View>
          </Card>
        </View>

        {!profile ? (
          <Card>
            <View className="items-center gap-3 px-2 py-6">
              <IconTile icon={ClipboardList} tone="primary" size={48} />
              <Text className="text-center text-base font-bold text-foreground">
                {t('workerHome.emptyTitle')}
              </Text>
              <Text className="text-center text-sm leading-5 text-muted-foreground">
                {t('workerHome.emptyDescription')}
              </Text>
            </View>
          </Card>
        ) : null}
      </DashboardScroll>
    </View>
  )
}
