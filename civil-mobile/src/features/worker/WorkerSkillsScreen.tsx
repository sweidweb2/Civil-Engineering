import { useEffect, useMemo, useState } from 'react'
import { router } from 'expo-router'
import { X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  ChoiceField,
  EmptyState,
  FormScreen,
  MenuGroup,
  MenuRow,
  Section,
  SelectField,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Pressable } from '@/components/ui/pressable'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { listCategories } from '@/services/categories'
import {
  WORKER_SKILL_LEVEL_OPTIONS,
  type WorkerSkillLevel,
  type WorkerSkillWrite,
} from '@/services/workers'

export function WorkerSkillsScreen() {
  const { t, i18n } = useTranslation()
  const colors = useThemeColors()
  const { profile, isReady, isLoading, error, refetch, isSaving, saveMerged } = useWorkerProfile()
  const [skills, setSkills] = useState<WorkerSkillWrite[]>([])
  const [draftCategoryId, setDraftCategoryId] = useState('')
  const [draftLevel, setDraftLevel] = useState<WorkerSkillLevel>('INTERMEDIATE')

  const loadCategories = useMemo(
    () => () => listCategories(1, 100, { kind: 'WORKER', includeCounts: false }),
    [],
  )
  const categoriesRemote = useRemoteData(loadCategories, {
    cacheKey: `${cacheKeys.categoriesPicker}:WORKER`,
  })
  const categories =
    categoriesRemote.status === 'success'
      ? categoriesRemote.data.data.filter((c) => c.isActive)
      : []

  useEffect(() => {
    if (!profile) return
    setSkills(profile.skills.map((s) => ({ categoryId: s.categoryId, level: s.level })))
  }, [profile])

  const categoryOptions = categories
    .filter((c) => !skills.some((s) => s.categoryId === c.id) || c.id === draftCategoryId)
    .map((c) => ({
      value: c.id,
      label: i18n.language?.startsWith('ar') && c.nameAr ? c.nameAr : c.name,
    }))

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) {
      map.set(c.id, i18n.language?.startsWith('ar') && c.nameAr ? c.nameAr : c.name)
    }
    if (profile) {
      for (const s of profile.skills) {
        if (!map.has(s.categoryId)) {
          map.set(
            s.categoryId,
            i18n.language?.startsWith('ar') && s.categoryNameAr ? s.categoryNameAr : s.categoryName,
          )
        }
      }
    }
    return map
  }, [categories, i18n.language, profile])

  function addSkill() {
    if (!draftCategoryId) return
    if (skills.some((s) => s.categoryId === draftCategoryId)) return
    setSkills((current) => [...current, { categoryId: draftCategoryId, level: draftLevel }])
    setDraftCategoryId('')
    setDraftLevel('INTERMEDIATE')
  }

  async function onSave() {
    const ok = await saveMerged(({ base }) => ({ ...base, skills }))
    if (ok) router.back()
  }

  return (
    <FormScreen
      title={t('worker.sections.skills')}
      subtitle={t('worker.skillsHint')}
      backHref="/worker/cv"
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch({ fresh: true })}
      loadingLabel={t('worker.loading')}
      footer={
        <Button onPress={() => void onSave()} disabled={isSaving || !isReady} className="w-full">
          {isSaving ? <ButtonSpinner /> : null}
          <ButtonText>{isSaving ? t('common.saving') : t('common.save')}</ButtonText>
        </Button>
      }
    >
      <Section title={t('worker.addSkill')} description={t('worker.addSkillHint')}>
        <SelectField
          label={t('worker.trade')}
          placeholder={t('worker.pickTrade')}
          options={categoryOptions}
          value={draftCategoryId}
          onChange={setDraftCategoryId}
        />
        <ChoiceField
          label={t('worker.skillLevel')}
          value={draftLevel}
          onChange={(value) => setDraftLevel(value as WorkerSkillLevel)}
          options={enumOptions(t, 'workerSkillLevel', WORKER_SKILL_LEVEL_OPTIONS)}
        />
        <Button variant="outline" onPress={addSkill} disabled={!draftCategoryId} className="w-full">
          <ButtonText>{t('worker.addSkillAction')}</ButtonText>
        </Button>
      </Section>

      {skills.length === 0 ? (
        <EmptyState title={t('worker.skillsEmpty')} description={t('worker.skillsEmptyHint')} />
      ) : (
        <MenuGroup>
          {skills.map((skill, index) => (
            <MenuRow
              key={skill.categoryId}
              label={nameById.get(skill.categoryId) ?? skill.categoryId}
              hint={enumLabel(t, 'workerSkillLevel', skill.level)}
              last={index === skills.length - 1}
              trailing={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('common.remove')} ${nameById.get(skill.categoryId) ?? ''}`}
                  onPress={() =>
                    setSkills((current) => current.filter((s) => s.categoryId !== skill.categoryId))
                  }
                  className="-me-3 size-11 items-center justify-center rounded-full active:bg-muted"
                >
                  <X size={18} color={colors.muted} strokeWidth={1.75} />
                </Pressable>
              }
            />
          ))}
        </MenuGroup>
      )}
    </FormScreen>
  )
}
