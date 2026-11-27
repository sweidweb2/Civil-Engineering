import { useCallback } from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import {
  FolderKanban,
  FolderPlus,
  type LucideIcon,
  Package,
  RotateCw,
  Star,
  Store,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeIn } from 'react-native-reanimated'

import { useTodayCaption } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import {
  WkError,
  WkEyebrow,
  WkGroup,
  WkHeroGlow,
  WkSkeletonCard,
  WkTabScroll,
} from '@/components/wk/kit'
import { useWkPalette } from '@/components/wk/palette'
import { PhotoScrim, PvSectionHead } from '@/components/wk/storefront'
import { ProjectGroupRow } from '@/features/pm/ui/kit'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { userFirstName } from '@/lib/user'
import { errorMessage } from '@/services/feedback'
import { type AdminOverview, getAdminOverview } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'
import { MONO_STYLE } from '@/theme/typography'

/** One request: backend aggregates every tile + the five most recent projects. */
async function loadOverview(): Promise<AdminOverview> {
  const { data } = await getAdminOverview()
  return data
}

const go = (href: string) => () => router.push(href as never)
const tab = (href: string) => () => router.replace(href as never)

/** Badge on the hero buttons. */
function Count({ value, solid }: { value: number; solid?: boolean }) {
  return (
    <View
      className={`h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 ${
        solid ? 'bg-wk-brand' : ''
      }`}
      style={solid ? undefined : { backgroundColor: 'rgba(255,255,255,0.2)' }}
    >
      <Text className="text-xs font-semibold text-white" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  )
}

export function AdminDashboardScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const today = useTodayCaption()
  const { c, shadow } = useWkPalette()
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardAdmin, persist: true })
  const data = remote.status === 'success' ? remote.data : null

  const requests = data?.pendingRequests ?? 0
  const reviews = data?.pendingReviews ?? 0
  const heroProject = data?.recentProjects.find((p) => p.mainImageUrl)
  const heroPhoto = heroProject?.mainImageUrl ?? null
  const heroTitle =
    requests + reviews > 0
      ? t('adminPortal.heroWaiting', {
          requests: t('adminPortal.signups', { count: requests }),
          reviews: t('adminPortal.reviewsCount', { count: reviews }),
        })
      : t('adminPortal.caughtUp')

  const stats: {
    icon: LucideIcon
    label: string
    value?: number
    hint?: string
    onPress: () => void
  }[] = [
    { icon: Users, label: t('users.title'), value: data?.users, onPress: tab('/admin/users') },
    {
      icon: Store,
      label: t('providers.title'),
      value: data?.providers,
      hint: data?.pendingProviders
        ? t('adminPortal.pendingCount', { count: data.pendingProviders })
        : undefined,
      onPress: tab('/admin/providers'),
    },
    {
      icon: FolderKanban,
      label: t('projects.title'),
      value: data?.projects,
      onPress: tab('/admin/projects'),
    },
    {
      icon: Package,
      label: t('listings.title'),
      value: data?.listings,
      onPress: go('/admin/listings'),
    },
  ]

  return (
    <WkTabScroll
      testID="e2e-root"
      refreshing={remote.isFetching && Boolean(data)}
      onRefresh={() => remote.refetch()}
    >
      {/* Date + greeting, refresh */}
      <View className="flex-row items-center justify-between gap-3 px-1 pt-1">
        <View className="min-w-0 flex-1 gap-1.5">
          <WkEyebrow>{today}</WkEyebrow>
          <Text className="text-[15px] font-medium text-wk-ink2" numberOfLines={1}>
            {t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('adminPortal.refresh')}
          onPress={() => void remote.refetch()}
          className="size-11 items-center justify-center rounded-full bg-wk-sf active:opacity-70"
          style={shadow}
        >
          <RotateCw size={18} color={c.ink2} strokeWidth={1.9} />
        </Pressable>
      </View>

      {remote.status === 'error' && !data ? (
        <WkError
          message={errorMessage(remote.error, t('common.errorGeneric'))}
          onRetry={() => void remote.refetch()}
        />
      ) : null}

      {/* Review hero */}
      <View className="h-[250px] overflow-hidden rounded-[28px] bg-wk-hero">
        {heroPhoto ? (
          <Animated.View entering={FadeIn.duration(500)} style={{ position: 'absolute', inset: 0 }}>
            <Image
              source={remoteImage(heroPhoto, heroProject?.mainImageKey)}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              style={{ position: 'absolute', inset: 0 }}
              contentFit="cover"
              transition={250}
            />
            <PhotoScrim
              id="adminHero"
              stops={[
                [0, 0.15],
                [0.4, 0.35],
                [1, 0.94],
              ]}
            />
          </Animated.View>
        ) : (
          <WkHeroGlow size={320} />
        )}
        <View className="absolute inset-x-5 bottom-[18px] gap-3.5">
          <View className="gap-1.5">
            <Text
              className="text-[11px] font-medium uppercase"
              style={[MONO_STYLE, { color: 'rgba(255,255,255,0.72)' }]}
            >
              {t('adminPortal.needsReview')}
            </Text>
            <Text className="text-[22px] font-semibold leading-[27px] text-white">
              {data ? heroTitle : ' '}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('adminPortal.requests')}: ${requests}`}
              onPress={go('/admin/queue')}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[14px] bg-white active:opacity-85"
            >
              <UserCheck size={17} color="#0A1F12" strokeWidth={2} />
              <Text className="text-sm font-semibold" style={{ color: '#0A1F12' }}>
                {t('adminPortal.requests')}
              </Text>
              <Count value={requests} solid />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('reviews.title')}: ${reviews}`}
              onPress={go('/admin/reviews')}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border active:opacity-85"
              style={{
                borderColor: 'rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <Star size={16} color="#FFFFFF" strokeWidth={2} />
              <Text className="text-sm font-semibold text-white">{t('reviews.title')}</Text>
              <Count value={reviews} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row flex-wrap gap-2.5">
        {stats.map((s) => (
          <Pressable
            key={s.label}
            accessibilityRole="button"
            accessibilityLabel={`${s.label}: ${s.value ?? '—'}`}
            onPress={s.onPress}
            className="gap-3.5 rounded-[20px] bg-wk-sf p-4 active:opacity-80"
            style={[shadow, { width: '48.5%', flexGrow: 1 }]}
          >
            <View className="flex-row items-center justify-between">
              <View className="size-9 items-center justify-center rounded-[11px] bg-wk-brand-soft">
                <s.icon size={18} color={c.brand} strokeWidth={1.9} />
              </View>
              {s.hint ? (
                <Text className="text-[11px] font-medium text-wk-amber" style={MONO_STYLE}>
                  {s.hint}
                </Text>
              ) : null}
            </View>
            <View className="gap-1">
              <Text
                className="text-[28px] font-semibold leading-8 text-wk-ink"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {s.value ?? '—'}
              </Text>
              <Text className="text-[13px] font-medium text-wk-ink2">{s.label}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Quick actions */}
      <View className="flex-row gap-2.5">
        {[
          { icon: UserPlus, label: t('users.new'), href: '/admin/users/new', primary: true },
          { icon: Store, label: t('providers.new'), href: '/admin/providers/new' },
          { icon: FolderPlus, label: t('projects.new'), href: '/admin/projects/new' },
        ].map((q) => (
          <Pressable
            key={q.href}
            accessibilityRole="button"
            accessibilityLabel={q.label}
            onPress={go(q.href)}
            className={`min-h-[92px] flex-1 items-start justify-between gap-2.5 rounded-[18px] p-3.5 active:opacity-85 ${
              q.primary ? 'bg-wk-ink' : 'bg-wk-sf'
            }`}
            style={q.primary ? undefined : shadow}
          >
            <View
              className={`size-[34px] items-center justify-center rounded-[10px] ${
                q.primary ? 'bg-wk-brand' : 'bg-wk-brand-soft'
              }`}
            >
              <q.icon size={17} color={q.primary ? '#FFFFFF' : c.brand} strokeWidth={2} />
            </View>
            <Text
              className={`text-[13px] font-semibold leading-4 ${q.primary ? 'text-wk-bg' : 'text-wk-ink'}`}
            >
              {q.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Recent projects */}
      {!data && remote.isLoading ? <WkSkeletonCard /> : null}
      {data && data.recentProjects.length > 0 ? (
        <View className="gap-2.5">
          <PvSectionHead
            label={<WkEyebrow>{t('dashboard.recentProjects')}</WkEyebrow>}
            action={{ label: t('common.seeAll'), onPress: tab('/admin/projects') }}
          />
          <WkGroup>
            {data.recentProjects.slice(0, 4).map((project) => (
              <ProjectGroupRow
                key={project.id}
                project={project}
                onPress={go(`/admin/projects/${project.id}`)}
              />
            ))}
          </WkGroup>
        </View>
      ) : null}
    </WkTabScroll>
  )
}
