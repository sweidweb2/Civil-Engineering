import { useCallback, useEffect, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Camera, FileUp, FolderOpen, Images, LayoutGrid, Mail, Phone } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { PvOptionSheet } from '@/features/provider/ui/kit'
import {
  WkChoice,
  WkField,
  WkFormScreen,
  WkPickerSheet,
  WkSection,
  WkSelect,
} from '@/features/worker/ui/forms'
import { useFilePick } from '@/hooks/useFilePick'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { ltr } from '@/lib/rtl'
import { formatOfferPrice, listDesignOffers, type DesignOffer } from '@/services/design-offers'
import {
  createDesignRequest,
  DESIGN_CATEGORY_OPTIONS,
  type DesignCategory,
  getDesignerContact,
} from '@/services/design-requests'
import { listProjects } from '@/services/projects'
import { useToastSuccess } from '@/services/toast'

const BASE = '/pm/design-requests'

function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** PM create form: subject, description, category, neededBy, optional project/offer + file. */
export function DesignRequestCreateScreen() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const params = useLocalSearchParams<{ projectId?: string; designOfferId?: string }>()
  const prefilledOfferId =
    typeof params.designOfferId === 'string'
      ? params.designOfferId
      : (params.designOfferId?.[0] ?? '')
  const { sheetOpen, setSheetOpen, isBusy, pickAndRun } = useFilePick()

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DesignCategory>('ARCHITECTURAL')
  const [neededBy, setNeededBy] = useState(todayIsoDate())
  const [projectId, setProjectId] = useState(params.projectId ?? '')
  const [designOfferId, setDesignOfferId] = useState(prefilledOfferId)
  const [file, setFile] = useState<{ uri: string; mime: string; name: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [projectPickerOpen, setProjectPickerOpen] = useState(false)
  const [offerPickerOpen, setOfferPickerOpen] = useState(false)

  const loadContact = useCallback(() => getDesignerContact(), [])
  const loadProjects = useCallback(() => listProjects({ page: 1, limit: 100 }), [])
  const loadOffers = useCallback(
    () => listDesignOffers({ page: 1, limit: 100, activeOnly: true }),
    [],
  )
  const contactRemote = useRemoteData(loadContact, {
    cacheKey: `${cacheKeys.designRequests}:contact`,
  })
  const projectsRemote = useRemoteData(loadProjects, {
    cacheKey: `${cacheKeys.designRequests}:projects`,
  })
  const offersRemote = useRemoteData(loadOffers, {
    cacheKey: `${cacheKeys.designOffers}:picker`,
  })

  const contact = contactRemote.status === 'success' ? contactRemote.data : null
  const projects = projectsRemote.status === 'success' ? projectsRemote.data.data : []
  const offers: DesignOffer[] = offersRemote.status === 'success' ? offersRemote.data.data : []

  useEffect(() => {
    if (prefilledOfferId) setDesignOfferId(prefilledOfferId)
  }, [prefilledOfferId])

  const selectedOffer = offers.find((offer) => offer.id === designOfferId) ?? null

  const projectOptions = useMemo(
    () => [
      { value: '', label: t('designRequests.noProject') },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects, t],
  )
  const offerOptions = useMemo(
    () => [
      { value: '', label: t('designRequests.noOffer') },
      ...offers.map((offer) => ({
        value: offer.id,
        label: `${offer.title} · ${formatOfferPrice(offer)}`,
      })),
    ],
    [offers, t],
  )
  const selectedProjectLabel =
    projectOptions.find((option) => option.value === projectId)?.label ?? null
  const selectedOfferLabel =
    offerOptions.find((option) => option.value === designOfferId)?.label ?? null

  const submit = async () => {
    const next: Record<string, string> = {}
    if (!subject.trim()) next.subject = t('designRequests.subjectRequired')
    if (!description.trim()) next.description = t('designRequests.descriptionRequired')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(neededBy.trim())) next.neededBy = t('common.dateFormat')
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const created = await createDesignRequest({
        subject: subject.trim(),
        description: description.trim(),
        category,
        neededBy: `${neededBy.trim()}T00:00:00.000Z`,
        projectId: projectId || null,
        designOfferId: designOfferId || null,
        file,
      })
      toastSuccess(t('designRequests.created'))
      router.replace(`${BASE}/${created.id}` as never)
    } catch (error) {
      handleApiError(error, t('designRequests.couldNotCreate'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <WkFormScreen
      title={t('designRequests.newRequest')}
      backHref={BASE}
      isLoading={contactRemote.isLoading || projectsRemote.isLoading || offersRemote.isLoading}
      footer={
        <View className="px-5 pb-2">
          <Pressable
            accessibilityRole="button"
            disabled={saving || isBusy}
            onPress={() => void submit()}
            className="h-12 items-center justify-center rounded-2xl bg-wk-brand active:opacity-90"
          >
            <Text className="text-[15px] font-semibold text-white">
              {saving ? t('common.creating') : t('designRequests.create')}
            </Text>
          </Pressable>
        </View>
      }
    >
      {contact ? (
        <WkSection icon={Mail} title={t('designRequests.designerContact')}>
          <Text className="-mt-1 mb-2 text-[12px] text-wk-ink3">
            {t('designRequests.designerContactHint')}
          </Text>
          <Text className="text-[14px] text-wk-ink">{ltr(contact.email)}</Text>
          <View className="mt-2 flex-row items-center gap-2">
            <Phone size={14} />
            <Text className="text-[14px] text-wk-ink">
              {contact.phone ? ltr(contact.phone) : t('designRequests.noPhone')}
            </Text>
          </View>
        </WkSection>
      ) : null}

      <WkSection icon={LayoutGrid} title={t('designRequests.designOffer')}>
        <WkSelect
          label={t('designRequests.designOffer')}
          value={selectedOfferLabel}
          placeholder={t('designRequests.offerPlaceholder')}
          onPress={() => setOfferPickerOpen(true)}
        />
        {selectedOffer?.imageUrl ? (
          <View className="mt-1 overflow-hidden rounded-[16px] border border-wk-line bg-wk-sf2">
            <Image
              source={remoteImage(selectedOffer.imageUrl, selectedOffer.imagePath)}
              style={{ width: '100%', height: 160 }}
              contentFit="cover"
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              recyclingKey={selectedOffer.imagePath ?? selectedOffer.id}
            />
          </View>
        ) : selectedOffer ? (
          <Text className="text-[12px] text-wk-ink3">{t('designRequests.offerNoImage')}</Text>
        ) : null}
        {selectedOffer ? (
          <Text className="text-[13px] leading-[19px] text-wk-ink2" numberOfLines={4}>
            {selectedOffer.description}
          </Text>
        ) : null}
      </WkSection>

      <WkSection icon={FileUp} title={t('designRequests.details')}>
        <WkField
          label={t('designRequests.subject')}
          value={subject}
          onChangeText={setSubject}
          error={errors.subject}
          placeholder={t('designRequests.subjectPlaceholder')}
        />
        <WkField
          label={t('designRequests.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          error={errors.description}
          placeholder={t('designRequests.descriptionPlaceholder')}
        />
        <WkChoice
          label={t('designRequests.category')}
          options={DESIGN_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={category}
          onChange={(value) => setCategory(value as DesignCategory)}
        />
        <WkField
          label={t('designRequests.neededBy')}
          value={neededBy}
          onChangeText={setNeededBy}
          placeholder="YYYY-MM-DD"
          error={errors.neededBy}
          maxLength={10}
          autoCapitalize="none"
          ltr
        />
        <WkSelect
          label={t('designRequests.project')}
          value={selectedProjectLabel}
          placeholder={t('designRequests.projectPlaceholder')}
          onPress={() => setProjectPickerOpen(true)}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheetOpen(true)}
          className="min-h-12 justify-center rounded-[14px] border border-dashed border-wk-line bg-wk-sf2 px-3 py-3"
        >
          <Text className="text-[13px] font-medium text-wk-ink">
            {file ? file.name : t('designRequests.optionalFile')}
          </Text>
        </Pressable>
      </WkSection>

      <WkPickerSheet
        visible={projectPickerOpen}
        onClose={() => setProjectPickerOpen(false)}
        title={t('designRequests.project')}
        options={projectOptions}
        value={projectId}
        isLoading={projectsRemote.isLoading}
        searchPlaceholder={t('designRequests.searchProjects')}
        emptyLabel={(query) =>
          query ? t('designRequests.noProjectsMatch', { query }) : t('designRequests.noProjects')
        }
        onSelect={(option) => {
          setProjectId(option.value)
          setProjectPickerOpen(false)
        }}
      />

      <WkPickerSheet
        visible={offerPickerOpen}
        onClose={() => setOfferPickerOpen(false)}
        title={t('designRequests.designOffer')}
        options={offerOptions}
        value={designOfferId}
        isLoading={offersRemote.isLoading}
        searchPlaceholder={t('designOffers.search')}
        emptyLabel={(query) => (query ? t('designOffers.emptySearch') : t('designOffers.empty'))}
        onSelect={(option) => {
          setDesignOfferId(option.value)
          setOfferPickerOpen(false)
        }}
      />

      <PvOptionSheet
        visible={sheetOpen}
        title={t('files.sheetTitle')}
        onClose={() => setSheetOpen(false)}
        options={(
          [
            ['camera', Camera, t('files.takePhoto')],
            ['library', Images, t('files.chooseLibrary')],
            ['file', FolderOpen, t('files.chooseFile')],
          ] as const
        ).map(([source, icon, text]) => ({
          key: source,
          icon,
          label: text,
          onPress: () =>
            void pickAndRun(source, async (picked) => {
              setFile({
                uri: picked.uri,
                mime: picked.mime,
                name: picked.originalName,
              })
            }),
        }))}
      />
    </WkFormScreen>
  )
}
