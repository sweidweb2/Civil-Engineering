import { useCallback, useEffect, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { FolderTree } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ChoiceField, FormError, FormScreen, Section, TextField, ToggleRow } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumOptions } from '@/i18n/labels'
import { ApiError } from '@/services/api'
import {
  CATEGORY_KIND_OPTIONS,
  type CategoryKind,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/services/categories'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import { useToastApiError, useToastSuccess } from '@/services/toast'

const BASE = '/admin/categories'

type AdminCategoryEditorScreenProps = {
  mode: 'create' | 'edit'
}

export function AdminCategoryEditorScreen({ mode }: AdminCategoryEditorScreenProps) {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const categoryId = typeof id === 'string' ? id : id?.[0]
  const toastApiError = useToastApiError()
  const toastSuccess = useToastSuccess()

  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [kind, setKind] = useState<CategoryKind>('MATERIAL')
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')
  const [error, setError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
    if (!name.trim()) {
      setError(t('categories.nameRequired'))
      return
    }
    setError(undefined)
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
        toastSuccess(t('categories.created'))
        router.replace(`${BASE}/${created.data.id}` as never)
      } else if (categoryId) {
        await updateCategory(categoryId, payload)
        toastSuccess(t('categories.saved'))
        await remote.refetch()
      }
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else
        showApiAlert(
          err,
          t(mode === 'create' ? 'categories.createFailed' : 'categories.saveFailed'),
        )
    } finally {
      setIsSaving(false)
    }
  }

  function onDelete() {
    if (!categoryId || isDeleting) return
    showBlockingAlert(t('categories.deleteTitle'), t('categories.deleteBody'), {
      cancelLabel: t('common.cancel'),
      confirmLabel: t('common.delete'),
      onConfirm: () => {
        void (async () => {
          setIsDeleting(true)
          try {
            await deleteCategory(categoryId)
            toastSuccess(t('categories.deleted'))
            router.replace(BASE as never)
          } catch (err) {
            if (err instanceof ApiError && err.status >= 500) toastApiError(err)
            else showApiAlert(err, t('categories.deleteFailed'))
          } finally {
            setIsDeleting(false)
          }
        })()
      },
    })
  }

  return (
    <FormScreen
      title={mode === 'create' ? t('categories.new') : (category?.name ?? t('categories.category'))}
      backHref={BASE}
      isLoading={mode === 'edit' && remote.isLoading}
      error={mode === 'edit' && remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      loadingLabel={t('categories.loadingOne')}
      footer={
        <>
          {mode === 'edit' ? (
            <Button
              className="flex-1"
              variant="destructive"
              onPress={onDelete}
              disabled={isDeleting}
              accessibilityState={{ busy: isDeleting }}
            >
              {isDeleting ? <ButtonSpinner /> : null}
              <ButtonText>{t('common.delete')}</ButtonText>
            </Button>
          ) : null}
          <Button
            className="flex-[2]"
            onPress={() => void onSave()}
            disabled={isSaving}
            accessibilityState={{ busy: isSaving }}
          >
            {isSaving ? <ButtonSpinner /> : null}
            <ButtonText>
              {isSaving
                ? t('common.saving')
                : mode === 'create'
                  ? t('categories.create')
                  : t('common.save')}
            </ButtonText>
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <Section title={t('categories.details')} icon={FolderTree}>
        <TextField label={t('common.name')} required value={name} onChangeText={setName} />
        <TextField label={t('categories.arabicName')} value={nameAr} onChangeText={setNameAr} />
        <ChoiceField
          label={t('categories.kind')}
          options={enumOptions(t, 'categoryKind', CATEGORY_KIND_OPTIONS)}
          value={kind}
          onChange={(value) => setKind(value as CategoryKind)}
        />
        <TextField
          label={t('categories.sortOrder')}
          value={sortOrder}
          onChangeText={setSortOrder}
          keyboardType="number-pad"
        />
        <ToggleRow label={t('common.active')} value={isActive} onValueChange={setIsActive} />
      </Section>
    </FormScreen>
  )
}
