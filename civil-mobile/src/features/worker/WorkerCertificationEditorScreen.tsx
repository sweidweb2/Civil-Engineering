import { useState } from 'react'
import { router } from 'expo-router'
import { BadgeCheck, Calendar } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { WkDangerZone, WkField, WkFormScreen, WkSection } from '@/features/worker/ui/forms'
import { WkButton, WkConfirm, type WkConfirmState } from '@/features/worker/ui/kit'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import {
  workerCertificationSchema,
  type WorkerCertificationValues,
} from '@/features/worker/worker.schema'
import { useSeedOnce } from '@/hooks/useSeedOnce'
import { type FieldErrors, parseForm } from '@/lib/form'
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
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  // Seed once: background refetches must not wipe unsaved edits.
  const seedItem = isNew || Number.isNaN(index) ? null : profile?.certifications[index]
  useSeedOnce(seedItem, (item) => {
    setForm({
      name: item.name,
      issuer: item.issuer,
      issuedAt: item.issuedAt,
      expiresAt: item.expiresAt,
      credentialId: item.credentialId,
    })
  })

  function toWrite(values: WorkerCertificationValues, sortOrder: number): WorkerCertificationWrite {
    return { ...values, sortOrder }
  }

  async function onSave() {
    const parsed = parseForm(workerCertificationSchema(t), form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    const ok = await saveMerged(
      ({ profile: latest, base }) => {
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
      },
      { successMessage: isNew ? t('worker.addedToCv') : t('worker.changesSaved') },
    )
    if (ok) router.back()
  }

  function onDelete() {
    if (isNew || !itemId) return
    setConfirm({
      title: t('worker.deleteItemTitle'),
      body: t('worker.deleteItemBody'),
      cta: t('common.delete'),
      onConfirm: () => {
        setConfirm(null)
        void (async () => {
          const ok = await saveMerged(
            ({ profile: latest, base }) => {
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
            },
            { successMessage: t('worker.deleted') },
          )
          if (ok) router.back()
        })()
      },
    })
  }

  return (
    <WkFormScreen
      title={isNew ? t('worker.addCertification') : t('worker.editCertification')}
      backHref="/worker/cv/certifications"
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch({ fresh: true })}
      footer={
        <WkButton
          label={isNew ? t('worker.addToCv') : t('worker.saveChanges')}
          loading={isSaving}
          disabled={!isReady}
          onPress={() => void onSave()}
        />
      }
    >
      <WkSection icon={BadgeCheck} title={t('worker.certSection')}>
        <WkField
          label={t('worker.certName')}
          required
          value={form.name}
          onChangeText={(value) => setForm((c) => ({ ...c, name: value }))}
          error={errors.name}
        />
        <WkField
          label={t('worker.issuer')}
          value={form.issuer ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, issuer: value }))}
          error={errors.issuer}
        />
        <WkField
          label={t('worker.credentialId')}
          value={form.credentialId ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, credentialId: value }))}
          error={errors.credentialId}
          autoCapitalize="characters"
          ltr
        />
      </WkSection>
      <WkSection icon={Calendar} title={t('worker.validitySection')}>
        <WkField
          label={t('worker.issuedAt')}
          value={form.issuedAt ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, issuedAt: value }))}
          error={errors.issuedAt}
          placeholder={t('common.dateFormat')}
          keyboardType="numbers-and-punctuation"
          ltr
        />
        <WkField
          label={t('worker.expiresAt')}
          value={form.expiresAt ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, expiresAt: value }))}
          error={errors.expiresAt}
          hint={t('worker.expiresHint')}
          placeholder={t('common.dateFormat')}
          keyboardType="numbers-and-punctuation"
          ltr
        />
      </WkSection>
      {!isNew ? (
        <WkDangerZone
          title={t('common.dangerZone')}
          body={t('worker.dangerBody')}
          label={t('common.delete')}
          disabled={isSaving || !isReady}
          onPress={onDelete}
        />
      ) : null}
      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </WkFormScreen>
  )
}
