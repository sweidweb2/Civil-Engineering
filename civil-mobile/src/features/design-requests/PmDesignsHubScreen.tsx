import { useState } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { DesignOffersGridScreen } from '@/features/design-offers/DesignOffersGridScreen'
import { DesignRequestsListScreen } from '@/features/design-requests/DesignRequestsListScreen'
import { useWkPalette } from '@/components/wk/palette'

type Tab = 'requests' | 'offers'

/** PM Designs tab: toggle between own requests and admin design offers. */
export function PmDesignsHubScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const [tab, setTab] = useState<Tab>('requests')

  return (
    <View className="flex-1 bg-wk-bg">
      <View className="gap-3 bg-wk-bg px-5 pb-2" style={{ paddingTop: insets.top + 10 }}>
        <Text className="text-[22px] font-semibold text-wk-ink" accessibilityRole="header">
          {t('designRequests.title')}
        </Text>
        <View
          className="flex-row rounded-[14px] border border-wk-line bg-wk-sf p-1"
          style={shadow}
          accessibilityRole="tablist"
        >
          {(
            [
              ['requests', t('designRequests.tabRequests')],
              ['offers', t('designRequests.tabOffers')],
            ] as const
          ).map(([value, label]) => {
            const on = tab === value
            return (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setTab(value)}
                className={`h-10 flex-1 items-center justify-center rounded-[11px] ${
                  on ? 'bg-wk-ink' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${on ? 'text-wk-bg' : 'text-wk-ink2'}`}
                  style={on ? undefined : { color: c.ink2 }}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {tab === 'requests' ? (
        <DesignRequestsListScreen basePath="/pm/design-requests" hubEmbedded />
      ) : (
        <DesignOffersGridScreen mode="pm" embedded />
      )}
    </View>
  )
}
