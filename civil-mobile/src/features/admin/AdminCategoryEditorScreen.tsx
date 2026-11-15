import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

import { AsyncState } from '@/components/feedback/AsyncState'
import { FormField } from '@/components/forms/FormField'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { BackButton } from '@/features/pm/components/BackButton'
import { useRemoteData } from '@/hooks/useRemoteData'
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
import { useToastApiError } from '@/services/toast'

const BASE = '/admin/categories'

type AdminCategoryEditorScreenProps = {
  mode: 'create' | 'edit'
}

export function AdminCategoryEditorScreen({ mode }: AdminCategoryEditorScreenProps) {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const categoryId = typeof id === 'string' ? id : id?.[0]
  const toastApiError = useToastApiError()

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
      setError('Name is required')
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
        showBlockingAlert('Created', 'Category was created.')
        router.replace(`${BASE}/${created.data.id}` as never)
      } else if (categoryId) {
        await updateCategory(categoryId, payload)
        showBlockingAlert('Saved', 'Category was updated.')
        await remote.refetch()
      }
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else
        showApiAlert(
          err,
          mode === 'create' ? 'Could not create category' : 'Could not save category',
        )
    } finally {
      setIsSaving(false)
    }
  }

  function onDelete() {
    if (!categoryId || isDeleting) return
    showBlockingAlert('Delete category?', 'This cannot be undone if the category is unused.', {
      cancelLabel: 'Cancel',
      confirmLabel: 'Delete',
      onConfirm: () => {
        void (async () => {
          setIsDeleting(true)
          try {
            await deleteCategory(categoryId)
            showBlockingAlert('Deleted', 'Category was removed.')
            router.replace(BASE as never)
          } catch (err) {
            if (err instanceof ApiError && err.status >= 500) toastApiError(err)
            else showApiAlert(err, 'Could not delete category')
          } finally {
            setIsDeleting(false)
          }
        })()
      },
    })
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title={mode === 'create' ? 'New category' : (category?.name ?? 'Category')}
        leftSlot={<BackButton fallbackHref={BASE} />}
      />

      <AsyncState
        isLoading={mode === 'edit' && remote.isLoading}
        error={mode === 'edit' && remote.status === 'error' ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingLabel="Loading category…"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-5 pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

          <FormField label="Name" isRequired>
            <Input>
              <InputField value={name} onChangeText={setName} placeholder="Category name" />
            </Input>
          </FormField>

          <FormField label="Arabic name">
            <Input>
              <InputField value={nameAr} onChangeText={setNameAr} />
            </Input>
          </FormField>

          <FormField label="Kind">
            <OptionChips
              options={CATEGORY_KIND_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={kind}
              onChange={(value) => setKind(value as CategoryKind)}
            />
          </FormField>

          <FormField label="Sort order">
            <Input>
              <InputField value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" />
            </Input>
          </FormField>

          <View className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <Text className="text-sm font-medium text-foreground">Active</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>

          <Button
            onPress={() => void onSave()}
            disabled={isSaving}
            accessibilityState={{ busy: isSaving }}
          >
            {isSaving ? <ButtonSpinner /> : null}
            <ButtonText>
              {isSaving ? 'Saving…' : mode === 'create' ? 'Create category' : 'Save category'}
            </ButtonText>
          </Button>

          {mode === 'edit' ? (
            <Button
              variant="destructive"
              onPress={onDelete}
              disabled={isDeleting}
              accessibilityState={{ busy: isDeleting }}
            >
              {isDeleting ? <ButtonSpinner /> : null}
              <ButtonText>{isDeleting ? 'Deleting…' : 'Delete category'}</ButtonText>
            </Button>
          ) : null}
        </ScrollView>
      </AsyncState>
    </View>
  )
}
