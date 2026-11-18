import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ChevronRight,
  FolderKanban,
  Images,
  ListChecks,
  MapPin,
  StickyNote,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { GalleryImagesField } from '@/components/files/GalleryImagesField'
import {
  Card,
  ChoiceField,
  DirectionalIcon,
  FieldRow,
  FormScreen,
  IconTile,
  ProgressBar,
  Section,
  StatusPill,
  TextField,
  Thumbnail,
  toneForStatus,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Pressable } from '@/components/ui/pressable'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
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

type PmProjectDetailScreenProps = {
  basePath?: string
}

export function PmProjectDetailScreen({ basePath = '/pm/projects' }: PmProjectDetailScreenProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
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
          <Card className="gap-3">
            <View className="flex-row items-center gap-3">
              <Thumbnail imageUrl={project.mainImageUrl} icon={FolderKanban} size={72} />
              <View className="min-w-0 flex-1 gap-2">
                <StatusPill
                  label={enumLabel(t, 'projectStatus', project.status)}
                  tone={toneForStatus(project.status)}
                />
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <ProgressBar value={project.progress} />
                  </View>
                  <Text className="text-sm font-bold text-foreground">
                    {Math.round(project.progress)}%
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 active:opacity-80"
            onPress={() => router.push(`${basePath}/${project.id}/stages` as never)}
          >
            <IconTile icon={ListChecks} />
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-foreground">{t('projects.stages')}</Text>
              <Text className="text-sm text-muted-foreground">{t('projects.stagesHint')}</Text>
            </View>
            <DirectionalIcon icon={ChevronRight} size={18} color={colors.primary} />
          </Pressable>

          <Section title={t('gallery.title')} icon={Images} tone="info">
            <GalleryImagesField kind="project" ownerId={project.id} />
          </Section>

          <Section title={t('projects.basics')} icon={FolderKanban}>
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

          <Section title={t('projects.location')} icon={MapPin} tone="info">
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

          <Section title={t('projects.notes')} icon={StickyNote} tone="warning">
            <TextField
              label={t('projects.notes')}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </Section>

          <View className="gap-3 rounded-2xl border border-destructive/30 p-5">
            <View className="gap-0.5">
              <Text className="text-base font-bold text-destructive">
                {t('projects.dangerZone')}
              </Text>
              <Text className="text-xs text-muted-foreground">{t('projects.dangerHint')}</Text>
            </View>
            <Button
              variant="destructive"
              onPress={onArchive}
              disabled={isArchiving}
              accessibilityState={{ busy: isArchiving }}
            >
              {isArchiving ? <ButtonSpinner /> : null}
              <ButtonText>{t('projects.archive')}</ButtonText>
            </Button>
          </View>
        </>
      ) : null}
    </FormScreen>
  )
}
