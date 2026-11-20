import { useCallback, useEffect, useMemo, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { FolderTree } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  WkChoice,
  WkDangerZone,
  WkField,
  WkFormScreen,
  type WkOption,
  WkPickerSheet,
  WkSection,
  WkSelect,
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
  getCategory,
  listParentCandidates,
  updateCategory,
} from '@/services/categories'
import { useToastSuccess } from '@/services/toast'
import { useLanguageStore } from '@/stores/languageStore'

const BASE = '/admin/categories'

type Errors = Partial<Record<'name' | 'sortOrder' | 'parentId', string>>

/** Admin category create / edit: names (EN / AR), kind, parent, order, active, delete. */
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
  /** '' = top-level. Two-level tree: the parent must be top-level and of the same kind. */
  const [parentId, setParentId] = useState('')
  const [parentOpen, setParentOpen] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  const load = useCallback(async () => {
    if (!categoryId) throw new Error('Category id required')
    return (await getCategory(categoryId)).data
  }, [categoryId])

  const remote = useRemoteData(load, { enabled: mode === 'edit' && Boolean(categoryId) })
  const category = remote.status === 'success' ? remote.data : null
  const hasChildren = (category?.childCount ?? 0) > 0

  const loadParents = useCallback(() => listParentCandidates(kind), [kind])
  const parents = useRemoteData(loadParents)
  const parentList = parents.status === 'success' ? parents.data : null
  const isAr = useLanguageStore((s) => s.language) === 'ar'
  const parentOptions = useMemo<WkOption[]>(
    () => [
      { value: '', label: t('categories.noParent') },
      ...(parentList ?? [])
        .filter((p) => p.id !== categoryId)
        .map((p) => ({ value: p.id, label: (isAr && p.nameAr) || p.name })),
    ],
    [parentList, categoryId, isAr, t],
  )
  const parentLabel =
    parentOptions.find((o) => o.value === parentId)?.label ??
    (parentId ? (isAr && category?.parentNameAr) || category?.parentName : undefined)

  useEffect(() => {
    if (!category) return
    setName(category.name)
    setNameAr(category.nameAr ?? '')
    setKind(category.kind)
    setIsActive(category.isActive)
    setSortOrder(String(category.sortOrder ?? 0))
    setParentId(category.parentId ?? '')
  }, [category])

  function changeKind(next: CategoryKind) {
    setKind(next)
    // A parent of another kind is rejected by the API.
    if (next !== kind) setParentId('')
  }

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
        parentId: parentId || null,
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
          onChange={(value) => changeKind(value as CategoryKind)}
        />
        <WkSelect
          label={t('categories.parent')}
          value={parentLabel}
          placeholder={t('categories.noParent')}
          onPress={() => setParentOpen(true)}
          error={errors.parentId}
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
      <WkPickerSheet
        visible={parentOpen}
        onClose={() => setParentOpen(false)}
        title={t('categories.parent')}
        options={hasChildren ? parentOptions.slice(0, 1) : parentOptions}
        value={parentId}
        isLoading={parents.isLoading}
        searchPlaceholder={t('categories.search')}
        emptyLabel={() => t('pmPortal.noMatches')}
        onSelect={(option) => {
          setParentId(option.value)
          if (errors.parentId) setErrors((x) => ({ ...x, parentId: undefined }))
          setParentOpen(false)
        }}
      />
      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </WkFormScreen>
  )
}
