import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { AsyncState } from '@/components/feedback/AsyncState'
import {
  EmptyState,
  Fab,
  FormScroll,
  ListCard,
  ScreenHeader,
  StandardListRow,
} from '@/components/kit'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'

type CollectionKind = 'experience' | 'education' | 'certifications'

type Row = {
  key: string
  title: string
  subtitle?: string | null
  statusLabel?: string
}

type WorkerCollectionListScreenProps = {
  kind: CollectionKind
}

function hrefFor(kind: CollectionKind, index: string) {
  return `/worker/cv/${kind}/${index}`
}

export function WorkerCollectionListScreen({ kind }: WorkerCollectionListScreenProps) {
  const { t } = useTranslation()
  const { profile, isLoading, error, refetch } = useWorkerProfile()

  const rows: Row[] =
    kind === 'experience'
      ? (profile?.experiences ?? []).map((item, index) => ({
          key: String(index),
          title: item.roleTitle,
          subtitle: [item.company, item.location].filter(Boolean).join(' · '),
          statusLabel: item.isCurrent ? t('worker.current') : undefined,
        }))
      : kind === 'education'
        ? (profile?.education ?? []).map((item, index) => ({
            key: String(index),
            title: item.school,
            subtitle: [item.degree, item.field].filter(Boolean).join(' · '),
          }))
        : (profile?.certifications ?? []).map((item, index) => ({
            key: String(index),
            title: item.name,
            subtitle: item.issuer,
          }))

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={t(`worker.sections.${kind}`)} backHref="/worker/cv" />
      <AsyncState
        isLoading={isLoading && !profile}
        error={error}
        onRetry={() => void refetch({ fresh: true })}
        loadingLabel={t('worker.loading')}
      >
        <View className="flex-1">
          {rows.length === 0 ? (
            <View className="flex-1 px-5 pt-8">
              <EmptyState
                title={t(`worker.${kind}Empty`)}
                description={t(`worker.${kind}EmptyHint`)}
              />
            </View>
          ) : (
            <FormScroll>
              <View className="gap-3 pb-16">
                {rows.map((row) => (
                  <ListCard
                    key={row.key}
                    accessibilityLabel={row.title}
                    onPress={() => router.push(hrefFor(kind, row.key) as never)}
                  >
                    <StandardListRow
                      title={row.title}
                      subtitle={row.subtitle}
                      statusLabel={row.statusLabel}
                      statusTone="success"
                    />
                  </ListCard>
                ))}
              </View>
            </FormScroll>
          )}
          <Fab label={t('common.add')} onPress={() => router.push(hrefFor(kind, 'new') as never)} />
        </View>
      </AsyncState>
    </View>
  )
}
