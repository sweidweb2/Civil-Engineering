import { ActivityIndicator, Text, View } from 'react-native'
import { Building2, Camera } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { PickSourceSheet } from '@/components/files/PickSourceSheet'
import { PressableScale, Thumbnail } from '@/components/kit'
import { useFilePick } from '@/hooks/useFilePick'
import { useThemeColors } from '@/hooks/useThemeColors'
import { clearProviderLogo, uploadProviderLogo } from '@/services/providers'
import { useToastApiError, useToastSuccess } from '@/services/toast'

/** Tap-to-change company logo for a provider. */
export function LogoField({
  providerId,
  logoUrl,
  onChanged,
}: {
  providerId: string
  logoUrl: string | null
  /** Called with the new download URL (or null once removed). */
  onChanged: (logoUrl: string | null) => void
}) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const toastSuccess = useToastSuccess()
  const toastApiError = useToastApiError()
  const { sheetOpen, setSheetOpen, isBusy, setIsBusy, pickAndRun } = useFilePick()

  async function onRemove() {
    setSheetOpen(false)
    setIsBusy(true)
    try {
      await clearProviderLogo(providerId)
      onChanged(null)
      toastSuccess(t('logo.removed'))
    } catch (error) {
      toastApiError(error)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <View className="items-center gap-3">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('logo.change')}
        disabled={isBusy}
        scaleTo={0.94}
        onPress={() => setSheetOpen(true)}
      >
        <Thumbnail imageUrl={logoUrl} icon={Building2} size={96} />
        <View className="absolute -bottom-1 -right-1 size-9 items-center justify-center rounded-full border-2 border-background bg-primary">
          <Camera size={16} color="#FFFFFF" />
        </View>
        {isBusy ? (
          <View className="absolute inset-0 items-center justify-center rounded-2xl bg-background/70">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </PressableScale>
      <Text className="text-xs font-semibold text-primary">{t('logo.change')}</Text>

      <PickSourceSheet
        visible={sheetOpen}
        title={t('logo.change')}
        onClose={() => setSheetOpen(false)}
        onPick={(source) =>
          void pickAndRun(source, async (picked) => {
            const result = await uploadProviderLogo(providerId, picked)
            onChanged(result.meta.logoDownloadUrl)
            toastSuccess(t('logo.updated'))
          })
        }
        onRemove={logoUrl ? () => void onRemove() : undefined}
        removeLabel={t('logo.remove')}
      />
    </View>
  )
}
