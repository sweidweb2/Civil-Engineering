import { FlatList, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, type LucideIcon, Plus } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Pressable } from '@/components/ui/pressable'
import { flipStyle, WkEmpty, WkError, WkPill, WkSkeletonCard, WkTopBar } from '@/components/wk/kit'
import { useWkPalette, type WkTone } from '@/components/wk/palette'
import { CV_SECTION_META, formatMonth, todayIso } from '@/features/worker/ui/sections'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { intlLocale } from '@/lib/locale'
import { errorMessage } from '@/services/feedback'

type CollectionKind = 'experience' | 'education' | 'certifications'

type Row = {
  key: string
  title: string
  subtitle?: string
  meta?: string
  pill?: { label: string; tone: WkTone }
}

function hrefFor(kind: CollectionKind, index: string) {
  return `/worker/cv/${kind}/${index}`
}

export function WorkerCollectionListScreen({ kind }: { kind: CollectionKind }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, float } = useWkPalette()
  const { profile, isReady, error, refetch } = useWorkerProfile()
  const locale = intlLocale()
  const today = todayIso()
  const Icon: LucideIcon = CV_SECTION_META[kind].icon

  const rows: Row[] =
    kind === 'experience'
      ? (profile?.experiences ?? []).map((item, index) => ({
          key: String(index),
          title: item.roleTitle,
          subtitle: [item.company, item.projectType].filter(Boolean).join(' · '),
          meta:
            item.startDate || item.isCurrent || item.endDate
              ? `${formatMonth(item.startDate, locale) || '—'} – ${
                  item.isCurrent ? t('worker.present') : formatMonth(item.endDate, locale) || '—'
                }`
              : undefined,
          pill: item.isCurrent ? { label: t('worker.current'), tone: 'green' } : undefined,
        }))
      : kind === 'education'
        ? (profile?.education ?? []).map((item, index) => ({
            key: String(index),
            title: item.school,
            subtitle: [item.degree, item.field].filter(Boolean).join(' · '),
            meta: [item.startYear, item.endYear].filter((y) => y != null).join(' – ') || undefined,
          }))
        : (profile?.certifications ?? []).map((item, index) => {
            const expired = Boolean(item.expiresAt && item.expiresAt < today)
            return {
              key: String(index),
              title: item.name,
              subtitle: item.issuer ?? undefined,
              meta: item.expiresAt
                ? t(expired ? 'worker.expiredOn' : 'worker.expiresOn', {
                    date: formatMonth(item.expiresAt, locale),
                  })
                : t('worker.noExpiry'),
              pill: item.expiresAt
                ? expired
                  ? { label: t('worker.expired'), tone: 'red' }
                  : { label: t('worker.valid'), tone: 'green' }
                : undefined,
            }
          })

  const addLabel = kind === 'experience' ? t('worker.addJob') : t('worker.addEntry')

  return (
    <View className="flex-1 bg-wk-bg">
      <WkTopBar
        title={t(`worker.sections.${kind}`)}
        backHref="/worker/cv"
        count={rows.length ? t('worker.countTotal', { count: rows.length }) : undefined}
      />
      <FlatList
        className="flex-1"
        data={error && !profile ? [] : !isReady ? [] : rows}
        keyExtractor={(row) => row.key}
        contentContainerClassName="gap-3 px-5 pt-2"
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom, flexGrow: 1 }}
        ListEmptyComponent={
          error && !profile ? (
            <WkError
              message={errorMessage(error, t('common.errorGeneric'))}
              onRetry={() => void refetch({ fresh: true })}
            />
          ) : !isReady ? (
            <View className="gap-3">
              <WkSkeletonCard />
              <WkSkeletonCard />
              <WkSkeletonCard />
            </View>
          ) : (
            <WkEmpty
              icon={Icon}
              title={t(`worker.${kind}Empty`)}
              body={t(`worker.${kind}EmptyHint`)}
            />
          )
        }
        renderItem={({ item: row }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={[row.title, row.subtitle, row.meta, row.pill?.label]
              .filter(Boolean)
              .join(', ')}
            onPress={() => router.push(hrefFor(kind, row.key) as never)}
            className="flex-row items-start gap-3.5 rounded-[20px] bg-wk-sf p-4 active:opacity-80"
            style={shadow}
          >
            <View className="size-10 items-center justify-center rounded-xl bg-wk-brand-soft">
              <Icon size={19} color={c.brand} strokeWidth={1.9} />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-[15px] font-semibold leading-[19px] text-wk-ink">
                {row.title}
              </Text>
              {row.subtitle ? (
                <Text className="text-[13px] leading-[18px] text-wk-ink2">{row.subtitle}</Text>
              ) : null}
              {row.meta || row.pill ? (
                <View className="flex-row flex-wrap items-center gap-2 pt-1">
                  {row.meta ? (
                    <Text
                      className="text-[11px] font-medium text-wk-ink3"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {row.meta}
                    </Text>
                  ) : null}
                  {row.pill ? <WkPill label={row.pill.label} tone={row.pill.tone} /> : null}
                </View>
              ) : null}
            </View>
            <View className="mt-2.5" style={flipStyle()}>
              <ChevronRight size={18} color={c.ink3} strokeWidth={1.9} />
            </View>
          </Pressable>
        )}
      />

      {/* Floating add button */}
      <View
        pointerEvents="box-none"
        className="absolute end-5"
        style={{ bottom: Math.max(insets.bottom, 16) + 20 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          onPress={() => router.push(hrefFor(kind, 'new') as never)}
          className="h-14 flex-row items-center gap-2 rounded-[28px] bg-wk-ink pe-[22px] ps-[18px] active:opacity-85"
          style={float}
        >
          <Plus size={20} color={c.bg} strokeWidth={2} />
          <Text className="text-[15px] font-semibold text-wk-bg">{addLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}
