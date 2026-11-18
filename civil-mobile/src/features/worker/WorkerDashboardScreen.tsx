import { useState } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import {
  ArrowRight,
  Briefcase,
  Clock,
  FileUser,
  type LucideIcon,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { useTodayCaption } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { cvSectionStatuses } from '@/features/worker/cvCompleteness'
import {
  WkButton,
  WkError,
  WkEyebrow,
  WkGroup,
  WkGroupLabel,
  WkHeroGlow,
  WkPill,
  WkProgressRing,
  WkRow,
  WkSkeletonCard,
  WkTabScroll,
} from '@/features/worker/ui/kit'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { AVAILABILITY_TONE, CV_SECTION_META, VERIFICATION_KEY } from '@/features/worker/ui/sections'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { enumLabel } from '@/i18n/labels'
import { invalidateWorkerCaches } from '@/lib/cacheKeys'
import { userFirstName } from '@/lib/user'
import { errorMessage } from '@/services/feedback'
import { useToastSuccess } from '@/services/toast'
import { requestWorkerVerification, type WorkerVerificationStatus } from '@/services/workers'
import { useAuthStore } from '@/stores/authStore'

const VERIFY_ICON: Record<WorkerVerificationStatus, LucideIcon> = {
  VERIFIED: ShieldCheck,
  REQUESTED: Clock,
  UNVERIFIED: ShieldAlert,
}

export function WorkerDashboardScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const today = useTodayCaption()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const { c, shadow } = useWorkerPalette()
  const { profile, verificationStatus, isReady, error, refetch, isFetching } = useWorkerProfile()
  const [isRequesting, setIsRequesting] = useState(false)

  const sections = cvSectionStatuses(profile)
  const total = sections.length
  const done = sections.filter((s) => s.done).length
  const percent = Math.round((done / total) * 100)
  const missing = sections.filter((s) => !s.done)
  const nextKey = missing[0]?.key
  const firstName = user ? userFirstName(user) : t('dashboard.there')

  const hero =
    done === 0
      ? {
          title: t('workerHome.heroStartTitle'),
          body: t('workerHome.heroStartBody'),
          cta: t('workerHome.heroStartCta'),
        }
      : done < total
        ? {
            title: t('workerHome.heroProgressTitle', { done, total }),
            body: t('workerHome.heroProgressBody', {
              section: t(`worker.sections.${nextKey}`),
            }),
            cta: t('workerHome.heroContinue'),
          }
        : {
            title: t('workerHome.heroDoneTitle'),
            body: t('workerHome.heroDoneBody'),
            cta: t('workerHome.heroDoneCta'),
          }

  const go = (href: string) => router.push(href as never)
  const onHero = () => go(nextKey ? CV_SECTION_META[nextKey].href : '/worker/cv')

  async function onRequestVerification() {
    if (isRequesting) return
    setIsRequesting(true)
    try {
      await requestWorkerVerification()
      invalidateWorkerCaches()
      toastSuccess(t('workerHome.requestSent'))
      await refetch({ fresh: true })
    } catch (err) {
      handleApiError(err, t('workerHome.requestFailed'))
    } finally {
      setIsRequesting(false)
    }
  }

  const verify = VERIFICATION_KEY[verificationStatus]
  const VerifyIcon = VERIFY_ICON[verificationStatus]
  const verifyBg =
    verify.tone === 'green'
      ? 'bg-wk-brand-soft'
      : verify.tone === 'amber'
        ? 'bg-wk-amber-soft'
        : 'bg-wk-sf'
  const verifyColor = verify.tone === 'green' ? c.brand : verify.tone === 'amber' ? c.amber : c.ink
  const verifyText =
    verify.tone === 'green'
      ? 'text-wk-brand'
      : verify.tone === 'amber'
        ? 'text-wk-amber'
        : 'text-wk-ink'

  const skillsCount = profile?.skills.length ?? 0
  const stats = [
    { key: 'experience', value: profile?.experiences.length ?? 0, label: t('workerHome.statJobs') },
    { key: 'skills', value: skillsCount, label: t('workerHome.statSkills') },
    {
      key: 'certifications',
      value: profile?.certifications.length ?? 0,
      label: t('workerHome.statCerts'),
    },
  ] as const

  const quick = [
    {
      key: 'cv',
      icon: FileUser,
      label: t('workerHome.openCv'),
      sub: t('workerHome.quickCvSub', { done, total }),
      href: '/worker/cv',
    },
    {
      key: 'job',
      icon: Briefcase,
      label: t('workerHome.addExperience'),
      sub: t('workerHome.quickAddJobSub'),
      href: '/worker/cv/experience/new',
    },
    {
      key: 'skills',
      icon: Wrench,
      label: t('workerHome.editSkills'),
      sub: skillsCount
        ? t('workerHome.quickSkillsSub', { count: skillsCount })
        : t('workerHome.quickSkillsNone'),
      href: '/worker/cv/skills',
    },
    {
      key: 'account',
      icon: Settings,
      label: t('workerHome.account'),
      sub: t('workerHome.quickAccountSub'),
      href: '/worker/account',
    },
  ]

  const availability = profile?.availability ?? 'AVAILABLE'
  const availabilityTone = AVAILABILITY_TONE[availability]

  return (
    <WkTabScroll
      testID="e2e-worker-dashboard"
      refreshing={isFetching && isReady}
      onRefresh={() => void refetch({ fresh: true })}
    >
      {/* Greeting + availability */}
      <View className="flex-row items-center justify-between gap-3 px-1 pt-1">
        <View className="min-w-0 flex-1 gap-1.5">
          <WkEyebrow>{today}</WkEyebrow>
          <Text className="text-[15px] font-medium text-wk-ink2" numberOfLines={1}>
            {t('dashboard.greeting', { name: firstName })}
          </Text>
        </View>
        {profile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('worker.availability')}: ${enumLabel(t, 'workerAvailability', availability)}`}
            onPress={() => go('/worker/cv/rates')}
            className="active:opacity-70"
          >
            <WkPill
              dot
              size="md"
              tone={availabilityTone}
              label={enumLabel(t, 'workerAvailability', availability)}
            />
          </Pressable>
        ) : null}
      </View>

      {error && !profile ? (
        <WkError
          message={errorMessage(error, t('common.errorGeneric'))}
          onRetry={() => void refetch({ fresh: true })}
        />
      ) : !isReady ? (
        <>
          <View className="h-[260px] rounded-[26px] bg-wk-hero opacity-90" />
          <WkSkeletonCard />
        </>
      ) : (
        <>
          {/* Hero: CV readiness */}
          <Animated.View
            entering={FadeInDown.duration(380)}
            className="gap-5 overflow-hidden rounded-[26px] bg-wk-hero p-5"
          >
            <WkHeroGlow />
            <View className="flex-row items-center gap-[18px]">
              <WkProgressRing percent={percent} />
              <View className="min-w-0 flex-1 gap-1.5">
                <WkEyebrow hero>{t('workerHome.readiness')}</WkEyebrow>
                <Text className="text-[17px] font-semibold leading-[21px] text-wk-hero-ink">
                  {hero.title}
                </Text>
                <Text className="text-[13px] leading-[19px] text-wk-hero-mute">{hero.body}</Text>
              </View>
            </View>
            <View className="flex-row border-t border-wk-hero-line pt-4">
              {stats.map((stat, i) => (
                <Pressable
                  key={stat.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${stat.value} ${stat.label}`}
                  onPress={() => go(CV_SECTION_META[stat.key].href)}
                  className={`flex-1 gap-1.5 px-3 active:opacity-70 ${i ? 'border-s border-wk-hero-line' : ''}`}
                >
                  <Text
                    className="text-[22px] font-semibold text-wk-hero-ink"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {stat.value}
                  </Text>
                  <WkEyebrow hero>{stat.label}</WkEyebrow>
                </Pressable>
              ))}
            </View>
            <WkButton
              label={hero.cta}
              variant="lime"
              icon={ArrowRight}
              iconAfter
              onPress={onHero}
            />
          </Animated.View>

          {/* Verification */}
          <View
            className={`flex-row items-center gap-3 rounded-[20px] py-3.5 pe-3.5 ps-4 ${verifyBg}`}
          >
            <View className="size-10 items-center justify-center rounded-xl bg-wk-sf">
              <VerifyIcon size={20} color={verifyColor} strokeWidth={1.9} />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className={`text-[15px] font-semibold ${verifyText}`}>{t(verify.title)}</Text>
              <Text className="text-[13px] leading-[19px] text-wk-ink2">
                {t(verify.description)}
              </Text>
            </View>
            {verificationStatus === 'UNVERIFIED' ? (
              <WkButton
                label={t('workerHome.request')}
                variant="ink"
                height={44}
                compact
                loading={isRequesting}
                onPress={() => void onRequestVerification()}
              />
            ) : null}
          </View>

          {/* Quick actions */}
          <View className="gap-3">
            {[quick.slice(0, 2), quick.slice(2)].map((row, r) => (
              <View key={r} className="flex-row gap-3">
                {row.map((q) => (
                  <Pressable
                    key={q.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${q.label}, ${q.sub}`}
                    onPress={() => go(q.href)}
                    className="min-h-[104px] flex-1 justify-between gap-3.5 rounded-[20px] bg-wk-sf p-4 active:opacity-80"
                    style={shadow}
                  >
                    <View className="size-10 items-center justify-center rounded-xl bg-wk-brand-soft">
                      <q.icon size={20} color={c.brand} strokeWidth={1.9} />
                    </View>
                    <View className="gap-0.5">
                      <Text className="text-[15px] font-semibold text-wk-ink">{q.label}</Text>
                      <Text className="text-[13px] text-wk-ink3" numberOfLines={1}>
                        {q.sub}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          {/* To finish */}
          {missing.length > 0 ? (
            <View className="gap-2.5">
              <WkGroupLabel>{t('workerHome.toFinish', { count: missing.length })}</WkGroupLabel>
              <WkGroup>
                {missing.slice(0, 3).map((s) => (
                  <WkRow
                    key={s.key}
                    icon={CV_SECTION_META[s.key].icon}
                    title={t(`worker.sections.${s.key}`)}
                    subtitle={t(`worker.sectionHints.${s.key}`)}
                    onPress={() => go(CV_SECTION_META[s.key].href)}
                  />
                ))}
              </WkGroup>
            </View>
          ) : null}
        </>
      )}
    </WkTabScroll>
  )
}
