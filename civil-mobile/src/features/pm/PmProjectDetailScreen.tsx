import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { FolderKanban, ListChecks } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { GalleryImagesField } from '@/components/files/GalleryImagesField'
import {
  ChoiceField,
  DangerZone,
  FieldRow,
  FormScreen,
  MenuGroup,
  MenuRow,
  ProgressBar,
  Section,
  StatusPill,
  TextField,
  Thumbnail,
  toneForStatus,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { invalidateProjectCaches } from '@/lib/cacheKeys'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import {
  archiveProject,
  getProjectById,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  type ProjectStatus,
  type ProjectType,
  updateProject,
} from '@/services/projects'
import { useToastSuccess } from '@/services/toast'
import { MONO_STYLE, TYPE } from '@/theme/typography'

type PmProjectDetailScreenProps = {
  basePath?: string
}

export function PmProjectDetailScreen({ basePath = '/pm/projects' }: PmProjectDetailScreenProps) {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = typeof id === 'string' ? id : id?.[0]
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()

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
      showApiAlert(new Error(t('projects.nameRequired')), t('projects.saveFailed'))
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
      invalidateProjectCaches()
      toastSuccess(t('projects.saved'))
      await remote.refetch()
    } catch (err) {
      handleApiError(err, t('projects.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  function onArchive() {
    if (!projectId || isArchiving) return
    showBlockingAlert(t('projects.archiveTitle'), t('projects.archiveBody'), {
      destructive: true,
      cancelLabel: t('common.cancel'),
      confirmLabel: t('projects.archive'),
      onConfirm: () => {
        void (async () => {
          setIsArchiving(true)
          try {
            await archiveProject(projectId)
            invalidateProjectCaches()
            toastSuccess(t('projects.archived'))
            router.replace(basePath as never)
          } catch (err) {
            handleApiError(err, t('projects.archiveFailed'))
          } finally {
            setIsArchiving(false)
          }
        })()
      },
    })
  }

  return (
    <FormScreen
      title={project?.name ?? t('projects.project')}
      subtitle={project?.code ?? undefined}
      backHref={basePath}
      isLoading={remote.isLoading}
      error={remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      loadingLabel={t('projects.loadingOne')}
      footer={
        <Button
          className="flex-1"
          onPress={() => void onSave()}
          disabled={isSaving}
          accessibilityState={{ busy: isSaving }}
        >
          {isSaving ? <ButtonSpinner /> : null}
          <ButtonText>{isSaving ? t('common.saving') : t('common.save')}</ButtonText>
        </Button>
      }
    >
      {project ? (
        <>
          <View className="gap-3.5">
            <View className="flex-row items-center gap-3">
              <Thumbnail imageUrl={project.mainImageUrl} icon={FolderKanban} size={56} />
              <View className="min-w-0 flex-1 items-start gap-1">
                <Text className={`${TYPE.title} text-foreground`} numberOfLines={2}>
                  {project.name}
                </Text>
                <StatusPill
                  label={enumLabel(t, 'projectStatus', project.status)}
                  tone={toneForStatus(project.status)}
                />
              </View>
            </View>
            <View className="gap-2">
              <View className="flex-row items-baseline justify-between">
                <Text className={`${TYPE.caption} text-muted-foreground`}>
                  {t('projects.progress')}
                </Text>
                <Text className="text-base text-foreground" style={MONO_STYLE}>
                  {Math.round(project.progress)}%
                </Text>
              </View>
              <ProgressBar value={project.progress} />
            </View>
          </View>

          <MenuGroup>
            <MenuRow
              icon={ListChecks}
              label={t('projects.stages')}
              hint={t('projects.stagesHint')}
              last
              onPress={() => router.push(`${basePath}/${project.id}/stages` as never)}
            />
          </MenuGroup>

          <Section title={t('gallery.title')}>
            <GalleryImagesField kind="project" ownerId={project.id} />
          </Section>

          <Section title={t('projects.basics')}>
            <TextField label={t('projects.name')} required value={name} onChangeText={setName} />
            <TextField label={t('projects.code')} value={code} onChangeText={setCode} />
            <ChoiceField
              label={t('projects.status')}
              options={enumOptions(t, 'projectStatus', PROJECT_STATUS_OPTIONS)}
              value={status}
              onChange={(value) => setStatus(value as ProjectStatus)}
            />
            <ChoiceField
              label={t('projects.type')}
              options={enumOptions(t, 'projectType', PROJECT_TYPE_OPTIONS)}
              value={type}
              allowClear
              onChange={(value) => setType(value as ProjectType | '')}
            />
            <TextField
              label={t('common.description')}
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </Section>

          <Section title={t('projects.location')}>
            <TextField label={t('common.address')} value={address} onChangeText={setAddress} />
            <FieldRow>
              <TextField label={t('common.city')} value={city} onChangeText={setCity} />
              <TextField label={t('common.country')} value={country} onChangeText={setCountry} />
            </FieldRow>
            <FieldRow>
              <TextField
                label={t('projects.start')}
                value={startDate}
                onChangeText={setStartDate}
                helper={t('common.dateFormat')}
                autoCapitalize="none"
              />
              <TextField
                label={t('projects.end')}
                value={endDate}
                onChangeText={setEndDate}
                helper={t('common.dateFormat')}
                autoCapitalize="none"
              />
            </FieldRow>
          </Section>

          <Section title={t('projects.notes')}>
            <TextField
              label={t('projects.notes')}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </Section>

          <DangerZone title={t('projects.dangerZone')} hint={t('projects.dangerHint')}>
            <Button
              variant="destructive"
              onPress={onArchive}
              disabled={isArchiving}
              accessibilityState={{ busy: isArchiving }}
            >
              {isArchiving ? <ButtonSpinner /> : null}
              <ButtonText>{t('projects.archive')}</ButtonText>
            </Button>
          </DangerZone>
        </>
      ) : null}
    </FormScreen>
  )
}
