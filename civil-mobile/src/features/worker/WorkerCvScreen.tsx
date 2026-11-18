import { Text, View } from 'react-native'
import { router } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import { Award, Briefcase, GraduationCap, MapPin, ScrollText, Wrench } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { AsyncState } from '@/components/feedback/AsyncState'
import {
  FormScroll,
  HeroMetric,
  IdentityBlock,
  MenuGroup,
  MenuRow,
  ProgressBar,
  ScreenHeader,
} from '@/components/kit'
import {
  cvCompletenessPercent,
  type CvSectionKey,
  cvSectionStatuses,
} from '@/features/worker/cvCompleteness'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { enumLabel } from '@/i18n/labels'
import { userDisplayName } from '@/lib/user'
import { useAuthStore } from '@/stores/authStore'

const SECTION_META: Record<CvSectionKey, { icon: LucideIcon; href: string }> = {
  basics: { icon: ScrollText, href: '/worker/cv/basics' },
  experience: { icon: Briefcase, href: '/worker/cv/experience' },
  education: { icon: GraduationCap, href: '/worker/cv/education' },
  certifications: { icon: Award, href: '/worker/cv/certifications' },
  skills: { icon: Wrench, href: '/worker/cv/skills' },
  rates: { icon: MapPin, href: '/worker/cv/rates' },
}

export function WorkerCvScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { profile, isLoading, error, refetch, isFetching } = useWorkerProfile()
  const percent = cvCompletenessPercent(profile)
  const sections = cvSectionStatuses(profile)
  const name = user ? userDisplayName(user) : t('worker.cvTitle')

  return (
    <View className="flex-1 bg-background" testID="e2e-worker-cv">
      <ScreenHeader title={t('worker.cvTitle')} />

      <AsyncState
        isLoading={isLoading && !profile}
        error={error}
        onRetry={() => void refetch({ fresh: true })}
        loadingLabel={t('worker.loading')}
      >
        <FormScroll>
          <IdentityBlock
            name={profile?.headline || name}
            detail={
              [
                profile?.primaryTrade,
                profile?.city,
                profile ? enumLabel(t, 'workerAvailability', profile.availability) : null,
              ]
                .filter(Boolean)
                .join(' · ') || t('worker.cvHint')
            }
          />

          <HeroMetric
            label={t('worker.completeness')}
            value={`${percent}%`}
            context={t('worker.completenessHint')}
          >
            <ProgressBar value={percent} />
          </HeroMetric>

          <MenuGroup>
            {sections.map((section, index) => {
              const meta = SECTION_META[section.key]
              const countLabel =
                section.count != null
                  ? t('worker.itemCount', { count: section.count })
                  : section.done
                    ? t('worker.sectionDone')
                    : t('worker.sectionTodo')
              return (
                <MenuRow
                  key={section.key}
                  icon={meta.icon}
                  label={t(`worker.sections.${section.key}`)}
                  hint={countLabel}
                  hintTone={section.done ? 'success' : undefined}
                  last={index === sections.length - 1}
                  onPress={() => router.push(meta.href as never)}
                />
              )
            })}
          </MenuGroup>

          {isFetching && profile ? (
            <Text className="text-xs text-muted-foreground">{t('common.loading')}</Text>
          ) : null}
        </FormScroll>
      </AsyncState>
    </View>
  )
}
