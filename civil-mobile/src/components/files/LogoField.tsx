import { useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Building2, Camera, ImageIcon, Trash2 } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { PressableScale, Thumbnail } from '@/components/kit'
import { useThemeColors } from '@/hooks/useThemeColors'
import { FilePickError, pickFile, type PickSource } from '@/services/filePicker'
import { clearProviderLogo, uploadProviderLogo } from '@/services/providers'
import { useToastApiError, useToastSuccess } from '@/services/toast'

import { OptionSheet } from './OptionSheet'

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
  const toastApiError = useToastApiError()
  const toastSuccess = useToastSuccess()
  const [open, setOpen] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  async function onPick(source: PickSource) {
    setOpen(false)
    try {
      const picked = await pickFile(source, t)
      if (!picked) return
      setIsBusy(true)
      const result = await uploadProviderLogo(providerId, picked)
      onChanged(result.meta.logoDownloadUrl)
      toastSuccess(t('logo.updated'))
    } catch (error) {
      if (error instanceof FilePickError) toastApiError(new Error(t(`files.${error.code}`)))
      else toastApiError(error)
    } finally {
      setIsBusy(false)
    }
  }

  async function onRemove() {
    setOpen(false)
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
        onPress={() => setOpen(true)}
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

      <OptionSheet
        visible={open}
        title={t('logo.change')}
        cancelLabel={t('common.cancel')}
        onClose={() => setOpen(false)}
        options={[
          {
            key: 'camera',
            icon: Camera,
            label: t('files.takePhoto'),
            onPress: () => void onPick('camera'),
          },
          {
            key: 'library',
            icon: ImageIcon,
            label: t('files.chooseLibrary'),
            onPress: () => void onPick('library'),
          },
          ...(logoUrl
            ? [
                {
                  key: 'remove',
                  icon: Trash2,
                  label: t('logo.remove'),
                  destructive: true,
                  onPress: () => void onRemove(),
                },
              ]
            : []),
        ]}
      />
    </View>
  )
}
