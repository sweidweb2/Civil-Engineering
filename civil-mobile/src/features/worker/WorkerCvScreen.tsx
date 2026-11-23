import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { CircleCheck, CircleDashed, Clock, ShieldAlert, ShieldCheck } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { MyAvatarPhoto } from '@/features/account/MyAvatarPhoto'
import { type CvSectionStatus, cvSectionStatuses } from '@/features/worker/cvCompleteness'
import {
  WkCard,
  WkError,
  WkGroup,
  WkGroupLabel,
  WkPill,
  WkProgressBar,
  WkRow,
  WkSkeletonCard,
  WkTabScroll,
} from '@/features/worker/ui/kit'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { AVAILABILITY_TONE, CV_SECTION_META, VERIFICATION_KEY } from '@/features/worker/ui/sections'
import { useWorkerCategories } from '@/features/worker/useWorkerCategories'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { enumLabel } from '@/i18n/labels'
import { ltr } from '@/lib/rtl'
import { userDisplayName } from '@/lib/user'
import { errorMessage } from '@/services/feedback'
import type { WorkerProfile } from '@/services/workers'
import { useAuthStore } from '@/stores/authStore'

const VERIFY_ICON = { VERIFIED: ShieldCheck, REQUESTED: Clock, UNVERIFIED: ShieldAlert } as const

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')
  ).toUpperCase()
}

export function WorkerCvScreen() {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { c } = useWorkerPalette()
  const { labelForName } = useWorkerCategories()
  const { profile, verificationStatus, isReady, error, refetch, isFetching } = useWorkerProfile()

  const sections = cvSectionStatuses(profile)
  const done = sections.filter((s) => s.done).length
  const percent = Math.round((done / sections.length) * 100)
  const missing = sections.filter((s) => !s.done)
  const name = user ? userDisplayName(user) : t('worker.cvTitle')

  const verify = VERIFICATION_KEY[verificationStatus]
  const VerifyIcon = VERIFY_ICON[verificationStatus]
  const verifyColor = verify.tone === 'green' ? c.brand : verify.tone === 'amber' ? c.amber : c.ink2
  const availability = profile?.availability ?? 'AVAILABLE'

  function metaFor(s: CvSectionStatus, p: WorkerProfile | null): string {
    if (s.key === 'rates' && s.done && p) {
      const currency = p.currency ?? ''
      return p.hourlyRate
        ? t('worker.rateHour', { amount: ltr(p.hourlyRate), currency })
        : t('worker.rateDay', { amount: ltr(p.dailyRate ?? ''), currency })
    }
    if (s.count != null)
      return s.count ? t('worker.itemCount', { count: s.count }) : t('worker.sectionTodo')
    return s.done ? t('worker.sectionDone') : t('worker.sectionTodo')
  }

  return (
    <WkTabScroll
      testID="e2e-worker-cv"
      refreshing={isFetching && isReady}
      onRefresh={() => refetch()}
    >
      {error && !profile ? (
        <WkError
          message={errorMessage(error, t('common.errorGeneric'))}
          onRetry={() => void refetch({ fresh: true })}
        />
      ) : !isReady ? (
        <>
          <WkSkeletonCard />
          <WkSkeletonCard />
          <WkSkeletonCard />
        </>
      ) : (
        <>
          {/* Profile + completeness */}
          <WkCard className="gap-5 rounded-[26px] p-5">
            <View className="flex-row items-center gap-3.5">
              <View className="size-[60px] items-center justify-center overflow-hidden rounded-[18px] bg-wk-brand-soft">
                <Text className="text-xl font-semibold text-wk-brand">{initialsOf(name)}</Text>
                <MyAvatarPhoto />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text
                  className="text-[17px] font-semibold leading-[21px] text-wk-ink"
                  numberOfLines={2}
                >
                  {profile?.headline || name}
                </Text>
                <Text className="text-[13px] text-wk-ink2" numberOfLines={1}>
                  {[labelForName(profile?.primaryTrade), profile?.city]
                    .filter(Boolean)
                    .join(' · ') || t('worker.cvHint')}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between gap-2">
              <WkPill
                dot
                size="md"
                tone={AVAILABILITY_TONE[availability]}
                label={enumLabel(t, 'workerAvailability', availability)}
              />
              <View className="flex-row items-center gap-1.5">
                <VerifyIcon size={15} color={verifyColor} strokeWidth={2} />
                <Text className="text-[13px] font-medium" style={{ color: verifyColor }}>
                  {t(verify.short)}
                </Text>
              </View>
            </View>
            <View className="gap-2.5 border-t border-wk-line pt-4">
              <View className="flex-row items-baseline justify-between">
                <Text className="text-[15px] font-semibold text-wk-ink">
                  {t('worker.completePct', { pct: percent })}
                </Text>
                <Text
                  className="text-[11px] font-medium text-wk-ink3"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {done} / {sections.length}
                </Text>
              </View>
              <WkProgressBar percent={percent} />
              <Text className="text-[13px] leading-[19px] text-wk-ink2">
                {missing.length === 0
                  ? t('worker.cvHintDone')
                  : t('worker.cvHintMissing', {
                      list: missing
                        .map((s) => t(`worker.sections.${s.key}`))
                        .join(i18n.language?.startsWith('ar') ? '، ' : ', '),
                    })}
              </Text>
            </View>
          </WkCard>

          {/* Sections */}
          <WkGroupLabel>{t('worker.sectionsLabel')}</WkGroupLabel>
          <WkGroup>
            {sections.map((s) => (
              <WkRow
                key={s.key}
                icon={CV_SECTION_META[s.key].icon}
                iconTone={s.done ? 'brand' : 'neutral'}
                title={t(`worker.sections.${s.key}`)}
                subtitle={metaFor(s, profile)}
                subtitleClassName={s.done ? 'text-wk-ink2' : 'text-wk-amber'}
                minHeight={68}
                trailing={
                  s.done ? (
                    <CircleCheck size={18} color={c.brand} strokeWidth={2} />
                  ) : (
                    <CircleDashed size={18} color={c.amber} strokeWidth={2} />
                  )
                }
                onPress={() => router.push(CV_SECTION_META[s.key].href as never)}
              />
            ))}
          </WkGroup>
        </>
      )}
    </WkTabScroll>
  )
}
