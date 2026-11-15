import { useCallback } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
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
  Avatar,
  Card,
  HeroHeader,
  IconTile,
  ProgressBar,
  SectionLabel,
  StatusPill,
  type Tone,
  toneForStatus,
} from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel } from '@/i18n/labels'
import { userDisplayName, userFirstName } from '@/lib/user'
import { listListings } from '@/services/listings'
import { listProjects, type Project } from '@/services/projects'
import { listProviders } from '@/services/providers'
import { listReviews } from '@/services/reviews'
import { listApprovals, listUsers } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

type Overview = {
  users: number | null
  providers: number | null
  pendingProviders: number | null
  projects: number | null
  listings: number | null
  pendingRequests: number | null
  pendingReviews: number | null
  recentProjects: Project[]
}

function totalOf(result: PromiseSettledResult<{ meta: { total: number } }>): number | null {
  return result.status === 'fulfilled' ? result.value.meta.total : null
}

/** Each count loads independently so one failing endpoint only blanks its own tile. */
async function loadOverview(): Promise<Overview> {
  const [users, providers, pendingProviders, projects, listings, requests, reviews] =
    await Promise.allSettled([
      listUsers(1, 1),
      listProviders(1, 1),
      listProviders(1, 1, undefined, 'PENDING'),
      listProjects({ page: 1, limit: 5 }),
      listListings(1, 1, { counts: false }),
      listApprovals({ approval: 'pending', page: 1, limit: 1 }),
      listReviews(1, 1, { status: 'PENDING' }),
    ])

  return {
    users: totalOf(users),
    providers: totalOf(providers),
    pendingProviders: totalOf(pendingProviders),
    projects: totalOf(projects),
    listings: totalOf(listings),
    pendingRequests: totalOf(requests),
    pendingReviews: totalOf(reviews),
    recentProjects: projects.status === 'fulfilled' ? projects.value.data : [],
  }
}

function formatCount(value: number | null | undefined, isLoading: boolean): string {
  if (isLoading) return '…'
  return value == null ? '—' : value.toLocaleString()
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      className="min-w-[46%] flex-1 gap-3 rounded-3xl border border-border/60 bg-card p-4 active:opacity-80"
      onPress={() => router.push(href as never)}
    >
      <IconTile icon={icon} tone={tone} size={40} />
      <View>
        <Text className="text-2xl font-bold text-foreground">{value}</Text>
        <Text className="text-sm text-muted-foreground">{label}</Text>
      </View>
    </Pressable>
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
      <ChevronRight size={18} color={colors.disabled} />
    </Pressable>
  )
}

function QuickAction({ icon, label, href }: { icon: LucideIcon; label: string; href: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-w-0 flex-1 items-center gap-2 active:opacity-70"
      onPress={() => router.push(href as never)}
    >
      <IconTile icon={icon} size={56} />
      <Text className="text-center text-xs font-semibold text-foreground" numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  )
}

export function AdminDashboardScreen() {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const user = useAuthStore((s) => s.user)
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load)

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
      <HeroHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
        subtitle={t('dashboard.subtitle')}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.openAccount')}
            onPress={() => router.push('/admin/account' as never)}
          >
            <Avatar name={user ? userDisplayName(user) : '?'} size={44} onHero />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-6 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={remote.isLoading && Boolean(data)}
            onRefresh={() => void remote.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {attention.length > 0 ? (
          <View className="gap-2">
            <SectionLabel>{t('dashboard.attention')}</SectionLabel>
            <Card className="py-1">
              {attention.map((item, index) => (
                <AttentionRow key={item.href} {...item} last={index === attention.length - 1} />
              ))}
            </Card>
          </View>
        ) : null}

        <View className="gap-2">
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

        <View className="gap-2">
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
          <View className="gap-2">
            <SectionLabel
              action={
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => router.push('/admin/projects' as never)}
                >
                  <Text className="text-sm font-semibold text-primary">{t('common.seeAll')}</Text>
                </Pressable>
              }
            >
              {t('dashboard.recentProjects')}
            </SectionLabel>
            <Card className="py-1">
              {data.recentProjects.map((project, index) => (
                <Pressable
                  key={project.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${project.name}`}
                  className={`gap-2 py-3 active:opacity-70 ${
                    index === data.recentProjects.length - 1 ? '' : 'border-b border-border/60'
                  }`}
                  onPress={() => router.push(`/admin/projects/${project.id}` as never)}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text
                      className="min-w-0 flex-1 text-base font-semibold text-foreground"
                      numberOfLines={1}
                    >
                      {project.name}
                    </Text>
                    <StatusPill
                      label={enumLabel(t, 'projectStatus', project.status)}
                      tone={toneForStatus(project.status)}
                    />
                  </View>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <ProgressBar value={project.progress} />
                    </View>
                    <Text className="w-10 text-right text-xs font-semibold text-muted-foreground">
                      {Math.round(project.progress)}%
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}
