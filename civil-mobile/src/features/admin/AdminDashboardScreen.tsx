import { useCallback } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import {
  ChevronRight,
  FolderKanban,
  type LucideIcon,
  Package,
  Star,
  Store,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  Card,
  DashboardScroll,
  DirectionalIcon,
  IconTile,
  MenuGroup,
  PressableScale,
  ProgressRow,
  ScreenHeader,
  SectionLabel,
  SeeAll,
  StatCard,
  type Tone,
  toneForStatus,
} from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { formatCount } from '@/lib/stats'
import { userFirstName } from '@/lib/user'
import { type AdminOverview, getAdminOverview } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

/** One request: backend aggregates every tile + the five most recent projects. */
async function loadOverview(): Promise<AdminOverview> {
  const { data } = await getAdminOverview()
  return data
}
function StatTile({
  icon,
  tone,
  label,
  value,
  href,
}: {
  icon: LucideIcon
  tone: Tone
  label: string
  value: string
  href: string
}) {
  return (
    <StatCard
      icon={icon}
      tone={tone}
      label={label}
      value={value}
      onPress={() => router.push(href as never)}
    />
  )
}

function AttentionRow({
  icon,
  label,
  count,
  href,
  last = false,
}: {
  icon: LucideIcon
  label: string
  count: number
  href: string
  last?: boolean
}) {
  const colors = useThemeColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${count} ${label}`}
      className={`flex-row items-center gap-3 py-3 active:opacity-70 ${
        last ? '' : 'border-b border-border/60'
      }`}
      onPress={() => router.push(href as never)}
    >
      <IconTile icon={icon} tone="warning" size={40} />
      <Text className="flex-1 text-base font-medium text-foreground">{label}</Text>
      <View className="min-w-7 items-center rounded-full bg-warning px-2 py-0.5">
        <Text className="text-sm font-bold text-white">{count}</Text>
      </View>
      <DirectionalIcon icon={ChevronRight} size={18} color={colors.disabled} />
    </Pressable>
  )
}

function QuickAction({ icon, label, href }: { icon: LucideIcon; label: string; href: string }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.92}
      className="min-w-0 flex-1 items-center gap-2"
      onPress={() => router.push(href as never)}
    >
      <IconTile icon={icon} size={56} round />
      <Text className="text-center text-xs font-semibold text-foreground" numberOfLines={2}>
        {label}
      </Text>
    </PressableScale>
  )
}

export function AdminDashboardScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardAdmin })

  const data = remote.status === 'success' ? remote.data : null
  const isFirstLoad = remote.isLoading && !data

  const attention = [
    {
      icon: UserCheck,
      label: t('dashboard.workerRequests'),
      count: data?.pendingRequests ?? 0,
      href: '/admin/queue',
    },
    {
      icon: Store,
      label: t('dashboard.pendingProviders'),
      count: data?.pendingProviders ?? 0,
      href: '/admin/providers',
    },
    {
      icon: Star,
      label: t('dashboard.pendingReviews'),
      count: data?.pendingReviews ?? 0,
      href: '/admin/reviews',
    },
  ].filter((item) => item.count > 0)

  return (
    <View className="flex-1 bg-background" testID="e2e-root">
      <ScreenHeader
        title={t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
      />

      <DashboardScroll
        refreshing={remote.isFetching && Boolean(data)}
        onRefresh={() => void remote.refetch()}
      >
        {attention.length > 0 ? (
          <View className="gap-3">
            <SectionLabel>{t('dashboard.attention')}</SectionLabel>
            <Card className="py-1">
              {attention.map((item, index) => (
                <AttentionRow key={item.href} {...item} last={index === attention.length - 1} />
              ))}
            </Card>
          </View>
        ) : null}

        <View className="gap-3">
          <SectionLabel>{t('dashboard.overview')}</SectionLabel>
          <View className="flex-row flex-wrap gap-3">
            <StatTile
              icon={Users}
              tone="primary"
              label={t('users.title')}
              value={formatCount(data?.users, isFirstLoad)}
              href="/admin/users"
            />
            <StatTile
              icon={Store}
              tone="info"
              label={t('providers.title')}
              value={formatCount(data?.providers, isFirstLoad)}
              href="/admin/providers"
            />
            <StatTile
              icon={FolderKanban}
              tone="success"
              label={t('projects.title')}
              value={formatCount(data?.projects, isFirstLoad)}
              href="/admin/projects"
            />
            <StatTile
              icon={Package}
              tone="warning"
              label={t('listings.title')}
              value={formatCount(data?.listings, isFirstLoad)}
              href="/admin/listings"
            />
          </View>
        </View>

        <View className="gap-3">
          <SectionLabel>{t('dashboard.quickActions')}</SectionLabel>
          <Card>
            <View className="flex-row justify-between">
              <QuickAction icon={UserPlus} label={t('users.new')} href="/admin/users/new" />
              <QuickAction icon={Store} label={t('providers.new')} href="/admin/providers/new" />
              <QuickAction
                icon={FolderKanban}
                label={t('projects.new')}
                href="/admin/projects/new"
              />
            </View>
          </Card>
        </View>

        {data && data.recentProjects.length > 0 ? (
          <View className="gap-3">
            <SectionLabel
              action={
                <SeeAll
                  label={t('common.seeAll')}
                  onPress={() => router.push('/admin/projects' as never)}
                />
              }
            >
              {t('dashboard.recentProjects')}
            </SectionLabel>
            <MenuGroup>
              {data.recentProjects.map((project, index) => (
                <ProgressRow
                  key={project.id}
                  icon={FolderKanban}
                  tone={toneForStatus(project.status)}
                  title={project.name}
                  caption={enumLabel(t, 'projectStatus', project.status)}
                  value={project.progress}
                  last={index === data.recentProjects.length - 1}
                  onPress={() => router.push(`/admin/projects/${project.id}` as never)}
                />
              ))}
            </MenuGroup>
          </View>
        ) : null}
      </DashboardScroll>
    </View>
  )
}
