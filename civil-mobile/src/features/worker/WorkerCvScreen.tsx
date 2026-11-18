import { Text, View } from 'react-native'
import { router } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import {
  Award,
  Briefcase,
  ChevronRight,
  GraduationCap,
  MapPin,
  ScrollText,
  Wrench,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { AsyncState } from '@/components/feedback/AsyncState'
import {
  Avatar,
  DirectionalIcon,
  FormScroll,
  IconTile,
  ProgressBar,
  ScreenHeader,
  StatusPill,
  type Tone,
  toneForStatus,
} from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import {
  cvCompletenessPercent,
  type CvSectionKey,
  cvSectionStatuses,
} from '@/features/worker/cvCompleteness'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel } from '@/i18n/labels'
import { userDisplayName } from '@/lib/user'
import { useAuthStore } from '@/stores/authStore'
import { softShadows } from '@/theme/shadows'

const SECTION_META: Record<CvSectionKey, { icon: LucideIcon; href: string; tone: Tone }> = {
  basics: { icon: ScrollText, href: '/worker/cv/basics', tone: 'primary' },
  experience: { icon: Briefcase, href: '/worker/cv/experience', tone: 'success' },
  education: { icon: GraduationCap, href: '/worker/cv/education', tone: 'info' },
  certifications: { icon: Award, href: '/worker/cv/certifications', tone: 'warning' },
  skills: { icon: Wrench, href: '/worker/cv/skills', tone: 'primary' },
  rates: { icon: MapPin, href: '/worker/cv/rates', tone: 'neutral' },
}

export function WorkerCvScreen() {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const user = useAuthStore((s) => s.user)
  const { profile, isLoading, error, refetch, isFetching } = useWorkerProfile()
  const percent = cvCompletenessPercent(profile)
  const sections = cvSectionStatuses(profile)
  const name = user ? userDisplayName(user) : t('worker.cvTitle')

  return (
    <View className="flex-1 bg-background" testID="e2e-worker-cv">
      <ScreenHeader title={t('worker.cvTitle')}>
        <View
          className="flex-row items-center gap-3 rounded-2xl border border-border/40 bg-card p-4"
          style={softShadows.card}
        >
          <Avatar name={name} size={56} />
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
              {profile?.headline || name}
            </Text>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {[profile?.primaryTrade, profile?.city].filter(Boolean).join(' · ') ||
                t('worker.cvHint')}
            </Text>
            {profile ? (
              <View className="flex-row">
                <StatusPill
                  label={enumLabel(t, 'workerAvailability', profile.availability)}
                  tone={toneForStatus(profile.availability)}
                />
              </View>
            ) : null}
          </View>
        </View>
      </ScreenHeader>

      <AsyncState
        isLoading={isLoading && !profile}
        error={error}
        onRetry={() => void refetch({ fresh: true })}
        loadingLabel={t('worker.loading')}
      >
        <FormScroll>
          <View
            className="gap-3 rounded-2xl border border-border/40 bg-card p-5"
            style={softShadows.card}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-foreground">
                {t('worker.completeness')}
              </Text>
              <Text className="text-sm font-semibold text-primary">{percent}%</Text>
            </View>
            <ProgressBar value={percent} />
            <Text className="text-xs text-muted-foreground">{t('worker.completenessHint')}</Text>
          </View>

          <View className="gap-3">
            {sections.map((section) => {
              const meta = SECTION_META[section.key]
              const countLabel =
                section.count != null
                  ? t('worker.itemCount', { count: section.count })
                  : section.done
                    ? t('worker.sectionDone')
                    : t('worker.sectionTodo')
              return (
                <Pressable
                  key={section.key}
                  accessibilityRole="button"
                  onPress={() => router.push(meta.href as never)}
                  className="flex-row items-center gap-3 rounded-2xl border border-border/40 bg-card p-4 active:opacity-90"
                  style={softShadows.card}
                >
                  <IconTile icon={meta.icon} tone={meta.tone} size={44} />
                  <View className="min-w-0 flex-1 gap-0.5">
                    <Text className="text-base font-bold text-foreground">
                      {t(`worker.sections.${section.key}`)}
                    </Text>
                    <Text className="text-sm text-muted-foreground">{countLabel}</Text>
                  </View>
                  <DirectionalIcon icon={ChevronRight} size={18} color={colors.disabled} />
                </Pressable>
              )
            })}
          </View>

          {isFetching && profile ? (
            <Text className="text-center text-xs text-muted-foreground">{t('common.loading')}</Text>
          ) : null}
        </FormScroll>
      </AsyncState>
    </View>
  )
}
