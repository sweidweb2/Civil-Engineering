import { useCallback } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { PenTool, Plus } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { WkSection } from '@/features/worker/ui/forms'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import {
  designCategoryLabel,
  designRequestStatusLabel,
  listDesignRequests,
} from '@/services/design-requests'

type DesignStageRequestsBlockProps = {
  projectId: string
  basePath?: '/pm/projects' | '/admin/projects'
}

/** Shown on the Design stage: linked requests + create CTA (PM). */
export function DesignStageRequestsBlock({
  projectId,
  basePath = '/pm/projects',
}: DesignStageRequestsBlockProps) {
  const { t } = useTranslation()
  const isPm = basePath.startsWith('/pm')
  const listBase = isPm ? '/pm/design-requests' : '/admin/design-requests'

  const load = useCallback(() => listDesignRequests({ projectId, page: 1, limit: 50 }), [projectId])
  const remote = useRemoteData(load, {
    cacheKey: `${cacheKeys.designRequests}:project:${projectId}`,
  })
  const rows = remote.status === 'success' ? remote.data.data : []

  return (
    <WkSection icon={PenTool} title={t('designRequests.stageSection')}>
      {isPm ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`${listBase}/new?projectId=${projectId}` as never)}
          className="mb-2 h-10 flex-row items-center justify-center gap-1.5 rounded-xl bg-wk-brand active:opacity-90"
        >
          <Plus size={16} color="#fff" />
          <Text className="text-[13px] font-semibold text-white">
            {t('designRequests.stageNew')}
          </Text>
        </Pressable>
      ) : null}

      {rows.length === 0 ? (
        <Text className="text-[13px] text-wk-ink3">{t('designRequests.stageEmpty')}</Text>
      ) : (
        <View className="gap-2">
          {rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              onPress={() => router.push(`${listBase}/${row.id}` as never)}
              className="rounded-[14px] border border-wk-line bg-wk-sf px-3 py-2.5 active:opacity-80"
            >
              <Text className="text-[14px] font-semibold text-wk-ink" numberOfLines={1}>
                {row.subject}
              </Text>
              <Text className="mt-0.5 text-[12px] text-wk-ink3">
                {designCategoryLabel(row.category)} · {designRequestStatusLabel(row.status)} ·{' '}
                {new Date(row.neededBy).toLocaleDateString()}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </WkSection>
  )
}
