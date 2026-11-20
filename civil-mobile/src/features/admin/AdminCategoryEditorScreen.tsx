import { useCallback, useEffect, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { FolderTree } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  WkChoice,
  WkDangerZone,
  WkField,
  WkFormScreen,
  WkSection,
  WkToggle,
} from '@/features/worker/ui/forms'
import { WkButton, WkConfirm, type WkConfirmState } from '@/features/worker/ui/kit'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumOptions } from '@/i18n/labels'
import { invalidateAdminCaches } from '@/lib/cacheKeys'
import {
  CATEGORY_KIND_OPTIONS,
  type CategoryKind,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/services/categories'
import { useToastSuccess } from '@/services/toast'

const BASE = '/admin/categories'

type Errors = Partial<Record<'name' | 'sortOrder', string>>

/** Admin category create / edit: names (EN / AR), kind, order, active, delete. */
export function AdminCategoryEditorScreen({ mode }: { mode: 'create' | 'edit' }) {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const categoryId = typeof id === 'string' ? id : id?.[0]
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()

  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [kind, setKind] = useState<CategoryKind>('MATERIAL')
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')
  const [errors, setErrors] = useState<Errors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  const load = useCallback(async () => {
    if (!categoryId) throw new Error('Category id required')
    const result = await listCategories(1, 200, { includeCounts: false })
    const found = result.data.find((item) => item.id === categoryId)
    if (!found) throw new Error('Category not found')
    return found
  }, [categoryId])

  const remote = useRemoteData(load, { enabled: mode === 'edit' && Boolean(categoryId) })
  const category = remote.status === 'success' ? remote.data : null

  useEffect(() => {
    if (!category) return
    setName(category.name)
    setNameAr(category.nameAr ?? '')
    setKind(category.kind)
    setIsActive(category.isActive)
    setSortOrder(String(category.sortOrder ?? 0))
  }, [category])

  async function onSave() {
    const e: Errors = {}
    if (!name.trim()) e.name = t('categories.nameRequired')
    if (sortOrder.trim() && !/^\d+$/.test(sortOrder.trim()))
      e.sortOrder = t('adminPortal.wholeNumber')
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setErrors({})
    setIsSaving(true)
    try {
      const payload = {
        name: name.trim(),
        nameAr: nameAr.trim() || null,
        kind,
        isActive,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      }
      if (mode === 'create') {
        const created = await createCategory(payload)
        invalidateAdminCaches()
        toastSuccess(t('categories.created'))
        router.replace(`${BASE}/${created.data.id}` as never)
      } else if (categoryId) {
        await updateCategory(categoryId, payload)
        invalidateAdminCaches()
        toastSuccess(t('categories.saved'))
        await remote.refetch()
      }
    } catch (err) {
      handleApiError(
        err,
        t(mode === 'create' ? 'categories.createFailed' : 'categories.saveFailed'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  function askDelete() {
    if (!categoryId || isDeleting) return
    setConfirm({
      title: t('categories.deleteTitle'),
      body: t('categories.deleteBody'),
      cta: t('common.delete'),
      onConfirm: () => {
        setConfirm(null)
        void (async () => {
          setIsDeleting(true)
          try {
            await deleteCategory(categoryId)
            invalidateAdminCaches()
            toastSuccess(t('categories.deleted'))
            router.replace(BASE as never)
          } catch (err) {
            handleApiError(err, t('categories.deleteFailed'))
          } finally {
            setIsDeleting(false)
          }
        })()
      },
    })
  }

  return (
    <WkFormScreen
      title={mode === 'create' ? t('categories.new') : (category?.name ?? t('categories.category'))}
      backHref={BASE}
      isLoading={mode === 'edit' && remote.isLoading && !category}
      error={mode === 'edit' && remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      testID="e2e-admin-category"
      footer={
        <WkButton
          label={
            isSaving
              ? t('common.saving')
              : mode === 'create'
                ? t('categories.create')
                : t('worker.saveChanges')
          }
          loading={isSaving}
          height={54}
          onPress={() => void onSave()}
        />
      }
    >
      <WkSection icon={FolderTree} title={t('categories.details')}>
        <WkField
          label={t('common.name')}
          required
          value={name}
          onChangeText={(v) => {
            setName(v)
            if (errors.name) setErrors((x) => ({ ...x, name: undefined }))
          }}
          error={errors.name}
        />
        <WkField label={t('categories.arabicName')} value={nameAr} onChangeText={setNameAr} />
        <WkChoice
          label={t('categories.kind')}
          options={enumOptions(t, 'categoryKind', CATEGORY_KIND_OPTIONS)}
          value={kind}
          onChange={(value) => setKind(value as CategoryKind)}
        />
        <WkField
          label={t('categories.sortOrder')}
          value={sortOrder}
          onChangeText={(v) => {
            setSortOrder(v)
            if (errors.sortOrder) setErrors((x) => ({ ...x, sortOrder: undefined }))
          }}
          error={errors.sortOrder}
          keyboardType="number-pad"
          ltr
        />
        <WkToggle
          label={t('common.active')}
          hint={t('adminPortal.categoryActiveHint')}
          value={isActive}
          onChange={setIsActive}
        />
      </WkSection>
      {mode === 'edit' ? (
        <WkDangerZone
          title={t('common.dangerZone')}
          body={t('categories.deleteBody')}
          label={t('common.delete')}
          disabled={isDeleting}
          onPress={askDelete}
        />
      ) : null}
      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </WkFormScreen>
  )
}
