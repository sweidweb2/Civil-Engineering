import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'

import { FormField } from '@/components/forms/FormField'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Textarea, TextareaInput } from '@/components/ui/textarea'
import { BackButton } from '@/features/pm/components/BackButton'
import { ApiError } from '@/services/api'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import { createProject, PROJECT_TYPE_OPTIONS, type ProjectType } from '@/services/projects'
import { useToastApiError } from '@/services/toast'

type PmProjectCreateScreenProps = {
  basePath?: string
}

export function PmProjectCreateScreen({ basePath = '/pm/projects' }: PmProjectCreateScreenProps) {
  const toastApiError = useToastApiError()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ProjectType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)

  async function onCreate() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setError(undefined)
    setIsSaving(true)
    try {
      const created = await createProject({
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        type: type || undefined,
        startDate: startDate.trim() || null,
        endDate: endDate.trim() || null,
      })
      showBlockingAlert('Created', 'Project was created.')
      router.replace(`${basePath}/${created.data.id}` as never)
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not create project')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="New project" leftSlot={<BackButton fallbackHref={basePath} />} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-5 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

        <FormField label="Name" isRequired>
          <Input>
            <InputField value={name} onChangeText={setName} placeholder="Project name" />
          </Input>
        </FormField>

        <FormField label="Code">
          <Input>
            <InputField value={code} onChangeText={setCode} placeholder="Optional code" />
          </Input>
        </FormField>

        <FormField label="Type">
          <OptionChips
            options={PROJECT_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={type}
            allowClear
            onChange={(value) => setType(value as ProjectType | '')}
          />
        </FormField>

        <FormField label="Description">
          <Textarea>
            <TextareaInput value={description} onChangeText={setDescription} />
          </Textarea>
        </FormField>

        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1">
            <FormField label="Start date" helperText="YYYY-MM-DD">
              <Input>
                <InputField
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-01-01"
                />
              </Input>
            </FormField>
          </View>
          <View className="min-w-0 flex-1">
            <FormField label="End date" helperText="YYYY-MM-DD">
              <Input>
                <InputField value={endDate} onChangeText={setEndDate} placeholder="2026-12-31" />
              </Input>
            </FormField>
          </View>
        </View>

        <Button
          onPress={() => void onCreate()}
          disabled={isSaving}
          accessibilityState={{ busy: isSaving }}
        >
          {isSaving ? <ButtonSpinner /> : null}
          <ButtonText>{isSaving ? 'Creating…' : 'Create project'}</ButtonText>
        </Button>
      </ScrollView>
    </View>
  )
}
