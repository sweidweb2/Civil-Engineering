import { useCallback, useMemo, useState } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import { ChartColumnIncreasing } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg'

import { WkField, WkSection } from '@/components/wk/forms'
import { WkButton } from '@/components/wk/kit'
import { useWkPalette } from '@/components/wk/palette'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useSeedOnce } from '@/hooks/useSeedOnce'
import { cacheKeys } from '@/lib/cacheKeys'
import { remoteCacheInvalidate } from '@/lib/remoteCache'
import { ltr } from '@/lib/rtl'
import { ApiError } from '@/services/api'
import {
  listProjectProductivityHours,
  localTodayIso,
  normalizeHoursInput,
  type ProjectProductivityHourEntry,
  upsertProjectProductivityHours,
  validateHoursInput,
} from '@/services/project-productivity'
import { useToastSuccess } from '@/services/toast'
import { MONO_STYLE } from '@/theme/typography'

const CHART_HEIGHT = 168
const PAD = { top: 12, right: 8, bottom: 28, left: 28 }
/** Calendar window drawn (one slot per day, gaps included) so bars never overflow. */
const CHART_DAYS = 30

/** `count` calendar days ending at `endIso` (inclusive), oldest first, as `YYYY-MM-DD`. */
function lastCalendarDays(endIso: string, count: number): string[] {
  const end = Date.parse(`${endIso}T00:00:00.000Z`)
  if (!Number.isFinite(end)) return []
  const days: string[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    days.push(new Date(end - i * 86_400_000).toISOString().slice(0, 10))
  }
  return days
}

function formatAxisDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return m && d ? `${m}/${d}` : iso
}

function ProductivityHoursChart({
  entries,
  today,
}: {
  entries: ProjectProductivityHourEntry[]
  today: string
}) {
  const { t } = useTranslation()
  const { c } = useWkPalette()
  const { width: windowWidth } = useWindowDimensions()
  const chartWidth = Math.max(280, Math.min(windowWidth - 72, 520))

  // One slot per calendar day ending today: unlogged days stay empty instead of
  // collapsing, so the chart reflects time, not just the number of entries.
  const points = useMemo(() => {
    const byDate = new Map(entries.map((e) => [e.date, Number(e.hours)]))
    return lastCalendarDays(today, CHART_DAYS).map((date) => ({
      date,
      hours: byDate.get(date) ?? 0,
    }))
  }, [entries, today])

  if (entries.length === 0) {
    return (
      <View className="items-center justify-center rounded-xl border border-dashed border-wk-line bg-wk-sf2 px-4 py-8">
        <Text className="text-center text-[13px] leading-5 text-wk-ink3">
          {t('pmPortal.productivityEmpty')}
        </Text>
      </View>
    )
  }

  const maxHours = Math.max(1, ...points.map((p) => p.hours), 1)
  const yMax = Math.min(24, Math.ceil(maxHours))
  const innerW = chartWidth - PAD.left - PAD.right
  const innerH = CHART_HEIGHT - PAD.top - PAD.bottom
  const gap = points.length > 1 ? Math.min(4, innerW / points.length / 4) : 0
  const barW = Math.max(1, (innerW - gap * Math.max(0, points.length - 1)) / points.length)
  const first = points[0]!
  const last = points[points.length - 1]!

  return (
    <View className="gap-2">
      <Text className="text-[13px] font-medium text-wk-ink2">
        {t('pmPortal.productivityChart')}
      </Text>
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        {[0, 0.5, 1].map((ratio) => {
          const y = PAD.top + innerH * (1 - ratio)
          return (
            <Line
              key={`grid-${ratio}`}
              x1={PAD.left}
              y1={y}
              x2={chartWidth - PAD.right}
              y2={y}
              stroke={c.line}
              strokeWidth={1}
            />
          )
        })}
        {[0, 0.5, 1].map((ratio) => {
          const y = PAD.top + innerH * (1 - ratio)
          const label = (yMax * ratio).toFixed(ratio === 0 || ratio === 1 ? 0 : 1)
          return (
            <SvgText
              key={`ylab-${ratio}`}
              x={PAD.left - 6}
              y={y + 3}
              fill={c.ink3}
              fontSize={10}
              textAnchor="end"
            >
              {label}
            </SvgText>
          )
        })}
        {points.map((p, i) => {
          const h = (p.hours / yMax) * innerH
          const x = PAD.left + i * (barW + gap)
          const y = PAD.top + innerH - h
          return (
            <Rect
              key={p.date}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, p.hours > 0 ? 2 : 0)}
              rx={Math.min(3, barW / 2)}
              fill={c.brand}
              opacity={0.9}
            />
          )
        })}
        <SvgText x={PAD.left} y={CHART_HEIGHT - 8} fill={c.ink3} fontSize={10} textAnchor="start">
          {formatAxisDate(first.date)}
        </SvgText>
        {points.length > 1 ? (
          <SvgText
            x={chartWidth - PAD.right}
            y={CHART_HEIGHT - 8}
            fill={c.ink3}
            fontSize={10}
            textAnchor="end"
          >
            {formatAxisDate(last.date)}
          </SvgText>
        ) : null}
      </Svg>
      <Text
        className="text-[12px] text-wk-ink3"
        style={{ ...MONO_STYLE, fontVariant: ['tabular-nums'] }}
      >
        {ltr(
          points.length === 1
            ? formatAxisDate(first.date)
            : `${formatAxisDate(first.date)} → ${formatAxisDate(last.date)}`,
        )}
      </Text>
    </View>
  )
}

/** Project productivity hours: today input + daily bar chart (one value per day). */
export function ProductivityHoursSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()

  const load = useCallback(() => listProjectProductivityHours(projectId), [projectId])
  const remote = useRemoteData(load, {
    enabled: Boolean(projectId),
    cacheKey: `${cacheKeys.projectProductivity}:${projectId}`,
  })
  const entries = remote.status === 'success' ? remote.data.data : []

  const today = localTodayIso()
  const todayEntry = entries.find((e) => e.date === today)

  const [hoursToday, setHoursToday] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)

  // Seed once from today's entry (or blank). Reset when project / day changes.
  useSeedOnce(
    remote.status === 'success' ? (todayEntry?.hours ?? '') : null,
    (hours) => setHoursToday(hours),
    `${projectId}:${today}`,
  )

  function hoursErrorMessage(code: string | null): string | undefined {
    if (!code) return undefined
    if (code === 'required') return t('pmPortal.productivityHoursRequired')
    if (code === 'format') return t('pmPortal.productivityHoursFormat')
    return t('pmPortal.productivityHoursRange')
  }

  async function onSave() {
    const hours = normalizeHoursInput(hoursToday)
    const code = validateHoursInput(hours)
    if (code) {
      setError(hoursErrorMessage(code))
      return
    }
    // Read the day at press time: a screen left open past midnight must not write
    // today's hours onto yesterday (the label re-renders, the closure may not).
    const day = localTodayIso()
    if (day !== today) {
      // Day rolled over since render: reload so the field shows the new day first.
      await remote.refetch()
      return
    }
    setIsSaving(true)
    setError(undefined)
    try {
      await upsertProjectProductivityHours(projectId, {
        hours,
        date: day,
        // Version of the entry this screen showed (null = none): a concurrent edit
        // by another manager / admin gets a 409 instead of being silently overwritten.
        expectedUpdatedAt: todayEntry?.updatedAt ?? null,
      })
      setHoursToday(hours)
      remoteCacheInvalidate(cacheKeys.projectProductivity)
      toastSuccess(t('pmPortal.productivitySaved'))
      await remote.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PRODUCTIVITY_VERSION_CONFLICT') {
        setError(t('pmPortal.productivityConflict'))
        remoteCacheInvalidate(cacheKeys.projectProductivity)
        await remote.refetch()
        return
      }
      handleApiError(err, t('pmPortal.productivitySaveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <WkSection icon={ChartColumnIncreasing} title={t('pmPortal.productivity')}>
      <WkField
        label={t('pmPortal.hoursWorkedToday')}
        value={hoursToday}
        onChangeText={(value) => {
          setHoursToday(value)
          if (error) setError(undefined)
        }}
        error={error}
        hint={t('pmPortal.hoursWorkedHint')}
        keyboardType="decimal-pad"
        placeholder="0.0"
        maxLength={4}
        ltr
        autoCapitalize="none"
      />
      <WkButton
        label={isSaving ? t('common.saving') : t('pmPortal.saveHours')}
        loading={isSaving}
        height={48}
        variant="soft"
        onPress={() => void onSave()}
      />
      <ProductivityHoursChart entries={entries} today={today} />
    </WkSection>
  )
}
