import { useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Plus, Search, Wrench, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { WkPickerSheet } from '@/components/wk/forms'
import {
  WkBodyScroll,
  WkEmpty,
  WkError,
  WkEyebrow,
  WkGroup,
  WkGroupLabel,
  WkPill,
  WkSkeletonCard,
  WkTopBar,
} from '@/components/wk/kit'
import { useWkPalette } from '@/components/wk/palette'
import { SKILL_LEVEL_TONE } from '@/features/worker/ui/sections'
import { useWorkerCategories } from '@/features/worker/useWorkerCategories'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { enumLabel } from '@/i18n/labels'
import { errorMessage } from '@/services/feedback'
import {
  WORKER_SKILL_LEVEL_OPTIONS,
  type WorkerSkill,
  type WorkerSkillLevel,
} from '@/services/workers'

/**
 * Skills: every add / remove saves straight away (no Save button). Saves go
 * through the shared serialized PUT queue, so quick successive taps cannot
 * clobber each other.
 */
export function WorkerSkillsScreen() {
  const { t, i18n } = useTranslation()
  const { c } = useWkPalette()
  const { profile, isReady, error, refetch, isSaving, saveMerged } = useWorkerProfile()
  const { trades, isLoading: tradesLoading } = useWorkerCategories()
  const [draft, setDraft] = useState<{ id: string; label: string } | null>(null)
  const [level, setLevel] = useState<WorkerSkillLevel>('INTERMEDIATE')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const isAr = i18n.language?.startsWith('ar') ?? false
  const skills = profile?.skills ?? []
  const nameOf = (s: WorkerSkill) => (isAr && s.categoryNameAr ? s.categoryNameAr : s.categoryName)
  const owned = new Set(skills.map((s) => s.categoryId))
  const options = trades
    .filter((tr) => !owned.has(tr.id))
    .map((tr) => ({ value: tr.id, label: tr.label }))

  async function addSkill() {
    if (!draft || adding) return
    const pick = draft
    setAdding(true)
    const ok = await saveMerged(
      ({ base }) =>
        base.skills.some((s) => s.categoryId === pick.id)
          ? base
          : { ...base, skills: [...base.skills, { categoryId: pick.id, level }] },
      { successMessage: t('worker.skillAdded', { name: pick.label }) },
    )
    setAdding(false)
    if (ok) {
      setDraft(null)
      setLevel('INTERMEDIATE')
    }
  }

  async function removeSkill(skill: WorkerSkill) {
    if (removingId) return
    setRemovingId(skill.categoryId)
    await saveMerged(
      ({ base }) => ({
        ...base,
        skills: base.skills.filter((s) => s.categoryId !== skill.categoryId),
      }),
      { successMessage: t('worker.skillRemoved', { name: nameOf(skill) }) },
    )
    setRemovingId(null)
  }

  const canAdd = Boolean(draft) && isReady

  return (
    <View className="flex-1 bg-wk-bg">
      <WkTopBar
        title={t('worker.sections.skills')}
        backHref="/worker/cv"
        count={skills.length ? t('worker.countTotal', { count: skills.length }) : undefined}
      />
      <WkBodyScroll bottom={60}>
        {error && !profile ? (
          <WkError
            message={errorMessage(error, t('common.errorGeneric'))}
            onRetry={() => void refetch({ fresh: true })}
          />
        ) : null}

        {/* Add a trade */}
        <View className="gap-3.5 rounded-[22px] bg-wk-hero p-[18px]">
          <WkEyebrow hero>{t('worker.addSkill')}</WkEyebrow>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('worker.trade')}: ${draft?.label ?? t('worker.searchTrades')}`}
            onPress={() => setPickerOpen(true)}
            className="h-12 flex-row items-center justify-between gap-2 rounded-xl border border-wk-hero-line bg-wk-hero-field pe-3 ps-3.5 active:opacity-80"
          >
            <Text
              className={`min-w-0 flex-1 text-[15px] ${draft ? 'text-wk-hero-ink' : 'text-wk-hero-mute'}`}
              numberOfLines={1}
            >
              {draft?.label ?? t('worker.searchTrades')}
            </Text>
            <Search size={17} color={c.heroMute} strokeWidth={1.9} />
          </Pressable>

          <View
            className="flex-row gap-1.5 rounded-[14px] bg-wk-hero-field p-1"
            accessibilityRole="radiogroup"
            accessibilityLabel={t('worker.skillLevel')}
          >
            {WORKER_SKILL_LEVEL_OPTIONS.map((opt) => {
              const on = opt.value === level
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setLevel(opt.value)}
                  className={`h-10 flex-1 items-center justify-center rounded-[10px] ${on ? 'bg-wk-hero-ink' : ''}`}
                >
                  <Text
                    className={`text-[13px] font-medium ${on ? 'text-wk-hero' : 'text-wk-hero-mute'}`}
                    numberOfLines={1}
                  >
                    {enumLabel(t, 'workerSkillLevel', opt.value)}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              draft ? t('worker.addNamed', { name: draft.label }) : t('worker.addSkillAction')
            }
            accessibilityState={{ disabled: !canAdd, busy: adding }}
            disabled={!canAdd || adding}
            onPress={() => void addSkill()}
            className={`h-[50px] flex-row items-center justify-center gap-2 rounded-[14px] px-4 ${
              canAdd ? 'bg-wk-lime active:opacity-85' : 'bg-wk-hero-field'
            }`}
          >
            {adding ? (
              <ActivityIndicator size="small" color={c.onLime} />
            ) : (
              <Plus size={18} color={canAdd ? c.onLime : c.heroMute} strokeWidth={2} />
            )}
            <Text
              className={`min-w-0 text-[15px] font-semibold ${canAdd ? 'text-wk-on-lime' : 'text-wk-hero-mute'}`}
              numberOfLines={1}
            >
              {draft ? t('worker.addNamed', { name: draft.label }) : t('worker.addSkillAction')}
            </Text>
          </Pressable>
        </View>

        {/* Current skills */}
        <WkGroupLabel>{t('worker.yourSkills')}</WkGroupLabel>
        {!isReady ? (
          <WkSkeletonCard />
        ) : skills.length === 0 ? (
          <WkEmpty
            compact
            icon={Wrench}
            title={t('worker.skillsEmpty')}
            body={t('worker.skillsEmptyHint')}
          />
        ) : (
          <WkGroup>
            {skills.map((skill) => {
              const name = nameOf(skill)
              const removing = removingId === skill.categoryId
              return (
                <View
                  key={skill.categoryId}
                  className={`min-h-[60px] flex-row items-center gap-3 bg-wk-sf pe-1.5 ps-4 ${removing ? 'opacity-50' : ''}`}
                >
                  <Text
                    className="min-w-0 flex-1 text-[15px] font-medium text-wk-ink"
                    numberOfLines={2}
                  >
                    {name}
                  </Text>
                  <WkPill
                    size="md"
                    tone={SKILL_LEVEL_TONE[skill.level]}
                    label={enumLabel(t, 'workerSkillLevel', skill.level)}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('common.remove')} ${name}`}
                    disabled={Boolean(removingId) || isSaving}
                    onPress={() => void removeSkill(skill)}
                    className="size-11 items-center justify-center rounded-xl active:bg-wk-red-soft"
                  >
                    {removing ? (
                      <ActivityIndicator size="small" color={c.ink3} />
                    ) : (
                      <X size={18} color={c.ink3} strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
              )
            })}
          </WkGroup>
        )}
      </WkBodyScroll>

      <WkPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('worker.chooseTrade')}
        options={options}
        value={draft?.id}
        isLoading={tradesLoading}
        searchPlaceholder={t('worker.searchTrades')}
        emptyLabel={(query) =>
          query ? t('worker.noTradesMatch', { query }) : t('worker.noTrades')
        }
        onSelect={(option) => {
          setDraft({ id: option.value, label: option.label })
          setPickerOpen(false)
        }}
      />
    </View>
  )
}
