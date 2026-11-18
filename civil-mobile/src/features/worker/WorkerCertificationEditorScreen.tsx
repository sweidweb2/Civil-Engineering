import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { DangerZone, FormScreen, Section, TextField } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import {
  workerCertificationSchema,
  type WorkerCertificationValues,
} from '@/features/worker/worker.schema'
import { type FieldErrors, parseForm } from '@/lib/form'
import { showBlockingAlert } from '@/services/feedback'
import type { WorkerCertificationWrite } from '@/services/workers'

const EMPTY: WorkerCertificationValues = {
  name: '',
  issuer: null,
  issuedAt: null,
  expiresAt: null,
  credentialId: null,
}

type Props = { indexParam: string }

export function WorkerCertificationEditorScreen({ indexParam }: Props) {
  const { t } = useTranslation()
  const { profile, isReady, isLoading, error, refetch, isSaving, saveMerged } = useWorkerProfile()
  const isNew = indexParam === 'new'
  const index = isNew ? -1 : Number.parseInt(indexParam, 10)
  const itemId = !isNew && profile?.certifications[index] ? profile.certifications[index].id : null
  const [form, setForm] = useState<WorkerCertificationValues>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (isNew || !profile || Number.isNaN(index) || !profile.certifications[index]) return
    const item = profile.certifications[index]
    setForm({
      name: item.name,
      issuer: item.issuer,
      issuedAt: item.issuedAt,
      expiresAt: item.expiresAt,
      credentialId: item.credentialId,
    })
  }, [index, isNew, profile])

  function toWrite(values: WorkerCertificationValues, sortOrder: number): WorkerCertificationWrite {
    return { ...values, sortOrder }
  }

  async function onSave() {
    const parsed = parseForm(workerCertificationSchema, form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    const ok = await saveMerged(({ profile: latest, base }) => {
      const current = base.certifications
      if (isNew || !itemId) {
        return {
          ...base,
          certifications: [...current, toWrite(parsed.data, current.length)],
        }
      }
      const freshIndex = latest?.certifications.findIndex((item) => item.id === itemId) ?? -1
      if (freshIndex < 0) {
        return {
          ...base,
          certifications: [...current, toWrite(parsed.data, current.length)],
        }
      }
      return {
        ...base,
        certifications: current.map((item, i) =>
          i === freshIndex ? toWrite(parsed.data, i) : item,
        ),
      }
    })
    if (ok) router.back()
  }

  function onDelete() {
    if (isNew || !itemId) return
    showBlockingAlert(t('worker.deleteItemTitle'), t('worker.deleteItemBody'), {
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
        void (async () => {
          const ok = await saveMerged(({ profile: latest, base }) => {
            const certifications = (latest?.certifications ?? [])
              .filter((item) => item.id !== itemId)
              .map((item, i) =>
                toWrite(
                  {
                    name: item.name,
                    issuer: item.issuer,
                    issuedAt: item.issuedAt,
                    expiresAt: item.expiresAt,
                    credentialId: item.credentialId,
                  },
                  i,
                ),
              )
            return { ...base, certifications }
          })
          if (ok) router.back()
        })()
      },
    })
  }

  return (
    <FormScreen
      title={isNew ? t('worker.addCertification') : t('worker.editCertification')}
      backHref="/worker/cv/certifications"
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch({ fresh: true })}
      loadingLabel={t('worker.loading')}
      footer={
        <View className="min-w-0 flex-1 gap-2">
          <Button onPress={() => void onSave()} disabled={isSaving || !isReady} className="w-full">
            {isSaving ? <ButtonSpinner /> : null}
            <ButtonText>{isSaving ? t('common.saving') : t('common.save')}</ButtonText>
          </Button>
        </View>
      }
    >
      <Section title={t('worker.sections.certifications')}>
        <TextField
          label={t('worker.certName')}
          required
          value={form.name}
          onChangeText={(value) => setForm((c) => ({ ...c, name: value }))}
          error={errors.name}
        />
        <TextField
          label={t('worker.issuer')}
          value={form.issuer ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, issuer: value }))}
          error={errors.issuer}
        />
        <TextField
          label={t('worker.issuedAt')}
          value={form.issuedAt ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, issuedAt: value }))}
          error={errors.issuedAt}
          placeholder={t('common.dateFormat')}
        />
        <TextField
          label={t('worker.expiresAt')}
          value={form.expiresAt ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, expiresAt: value }))}
          error={errors.expiresAt}
          placeholder={t('common.dateFormat')}
        />
        <TextField
          label={t('worker.credentialId')}
          value={form.credentialId ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, credentialId: value }))}
          error={errors.credentialId}
        />
      </Section>
      {!isNew ? (
        <DangerZone title={t('common.dangerZone')}>
          <Button variant="destructive" onPress={onDelete} disabled={isSaving || !isReady}>
            <ButtonText>{t('common.delete')}</ButtonText>
          </Button>
        </DangerZone>
      ) : null}
    </FormScreen>
  )
}
