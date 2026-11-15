import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

import { AsyncState } from '@/components/feedback/AsyncState'
import { FormField } from '@/components/forms/FormField'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Badge, BadgeText } from '@/components/ui/badge'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Textarea, TextareaInput } from '@/components/ui/textarea'
import { BackButton } from '@/features/pm/components/BackButton'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import {
  archiveProject,
  getProjectById,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  type ProjectStatus,
  type ProjectType,
  projectStatusLabel,
  updateProject,
} from '@/services/projects'
import { useToastApiError } from '@/services/toast'

type PmProjectDetailScreenProps = {
  basePath?: string
}

export function PmProjectDetailScreen({ basePath = '/pm/projects' }: PmProjectDetailScreenProps) {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = typeof id === 'string' ? id : id?.[0]
  const toastApiError = useToastApiError()

  const load = useCallback(() => {
    if (!projectId) return Promise.reject(new Error('Project id required'))
    return getProjectById(projectId)
  }, [projectId])
  const remote = useRemoteData(load, { enabled: Boolean(projectId) })
  const project = remote.status === 'success' ? remote.data.data : null

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ProjectType | ''>('')
  const [status, setStatus] = useState<ProjectStatus>('DRAFT')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  useEffect(() => {
    if (!project) return
    setName(project.name ?? '')
    setCode(project.code ?? '')
    setDescription(project.description ?? '')
    setType(project.type ?? '')
    setStatus(project.status)
    setAddress(project.address ?? '')
    setCity(project.city ?? '')
    setCountry(project.country ?? '')
    setStartDate(project.startDate?.slice(0, 10) ?? '')
    setEndDate(project.endDate?.slice(0, 10) ?? '')
    setNotes(project.notes ?? '')
  }, [project])

  async function onSave() {
    if (!projectId || !name.trim()) {
      showApiAlert(new Error('Name is required'), 'Could not save')
      return
    }
    setIsSaving(true)
    try {
      await updateProject(projectId, {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        type: type || undefined,
        status,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        startDate: startDate.trim() || null,
        endDate: endDate.trim() || null,
        notes: notes.trim() || undefined,
      })
      showBlockingAlert('Saved', 'Project was updated.')
      await remote.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not save project')
    } finally {
      setIsSaving(false)
    }
  }

  function onArchive() {
    if (!projectId || isArchiving) return
    showBlockingAlert(
      'Archive project?',
      'The project will be archived and leave the active list.',
      {
        cancelLabel: 'Cancel',
        confirmLabel: 'Archive',
        onConfirm: () => {
          void (async () => {
            setIsArchiving(true)
            try {
              await archiveProject(projectId)
              showBlockingAlert('Archived', 'Project was archived.')
              router.replace(basePath as never)
            } catch (err) {
              if (err instanceof ApiError && err.status >= 500) toastApiError(err)
              else showApiAlert(err, 'Could not archive project')
            } finally {
              setIsArchiving(false)
            }
          })()
        },
      },
    )
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title={project?.name ?? 'Project'}
        leftSlot={<BackButton fallbackHref={basePath} />}
        rightSlot={
          project ? (
            <Badge variant={project.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
              <BadgeText>{projectStatusLabel(project.status)}</BadgeText>
            </Badge>
          ) : undefined
        }
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.status === 'error' ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingLabel="Loading project…"
      >
        {project ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-4 px-4 py-4 pb-10"
            keyboardShouldPersistTaps="handled"
          >
            <Button
              variant="outline"
              onPress={() => router.push(`${basePath}/${project.id}/stages` as never)}
            >
              <ButtonText>Open stages stepper</ButtonText>
            </Button>

            <FormField label="Name" isRequired>
              <Input>
                <InputField value={name} onChangeText={setName} />
              </Input>
            </FormField>

            <FormField label="Code">
              <Input>
                <InputField value={code} onChangeText={setCode} />
              </Input>
            </FormField>

            <FormField label="Status">
              <OptionChips
                options={PROJECT_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={status}
                onChange={(value) => setStatus(value as ProjectStatus)}
              />
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

            <FormField label="Address">
              <Input>
                <InputField value={address} onChangeText={setAddress} />
              </Input>
            </FormField>

            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <FormField label="City">
                  <Input>
                    <InputField value={city} onChangeText={setCity} />
                  </Input>
                </FormField>
              </View>
              <View className="min-w-0 flex-1">
                <FormField label="Country">
                  <Input>
                    <InputField value={country} onChangeText={setCountry} />
                  </Input>
                </FormField>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <FormField label="Start" helperText="YYYY-MM-DD">
                  <Input>
                    <InputField value={startDate} onChangeText={setStartDate} />
                  </Input>
                </FormField>
              </View>
              <View className="min-w-0 flex-1">
                <FormField label="End" helperText="YYYY-MM-DD">
                  <Input>
                    <InputField value={endDate} onChangeText={setEndDate} />
                  </Input>
                </FormField>
              </View>
            </View>

            <FormField label="Notes">
              <Textarea>
                <TextareaInput value={notes} onChangeText={setNotes} />
              </Textarea>
            </FormField>

            <Button
              onPress={() => void onSave()}
              disabled={isSaving}
              accessibilityState={{ busy: isSaving }}
            >
              {isSaving ? <ButtonSpinner /> : null}
              <ButtonText>{isSaving ? 'Saving…' : 'Save project'}</ButtonText>
            </Button>

            <Button
              variant="destructive"
              onPress={onArchive}
              disabled={isArchiving}
              accessibilityState={{ busy: isArchiving }}
            >
              {isArchiving ? <ButtonSpinner /> : null}
              <ButtonText>{isArchiving ? 'Archiving…' : 'Archive project'}</ButtonText>
            </Button>
          </ScrollView>
        ) : null}
      </AsyncState>
    </View>
  )
}
