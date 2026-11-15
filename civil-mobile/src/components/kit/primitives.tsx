import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import type { LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'

import { useThemeColors } from '@/hooks/useThemeColors'

import { type Tone, TONE_BG, TONE_COLOR, TONE_DOT, TONE_TEXT } from './tones'

/** Rounded status chip with a leading dot. */
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${TONE_BG[tone]}`}>
      <View className={`size-1.5 rounded-full ${TONE_DOT[tone]}`} />
      <Text className={`text-xs font-semibold ${TONE_TEXT[tone]}`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

/** Small tinted square holding an icon. */
export function IconTile({
  icon: Icon,
  tone = 'primary',
  size = 44,
}: {
  icon: LucideIcon
  tone?: Tone
  size?: number
}) {
  const colors = useThemeColors()
  return (
    <View
      className={`items-center justify-center rounded-2xl ${TONE_BG[tone]}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.46)} color={colors[TONE_COLOR[tone]]} />
    </View>
  )
}

export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const second = parts.length > 1 ? (parts[1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return (first + second).toUpperCase()
}

/** Circular avatar: image when available, initials otherwise. */
export function Avatar({
  name,
  imageUrl,
  size = 44,
  onHero = false,
}: {
  name: string
  imageUrl?: string | null
  size?: number
  /** Light-on-dark variant for use inside the hero header. */
  onHero?: boolean
}) {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full ${
        onHero ? 'bg-hero-foreground/20' : 'bg-primary/10'
      }`}
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      ) : (
        <Text
          className={`font-bold ${onHero ? 'text-hero-foreground' : 'text-primary'}`}
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initialsOf(name)}
        </Text>
      )}
    </View>
  )
}

/** White rounded surface used for every card in the app. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-3xl border border-border/60 bg-card p-4 ${className ?? ''}`}>
      {children}
    </View>
  )
}

export function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <View
      className="h-2 overflow-hidden rounded-full bg-muted"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View className={`h-full rounded-full ${TONE_DOT[tone]}`} style={{ width: `${pct}%` }} />
    </View>
  )
}

/** Label / value line used on detail screens. */
export function InfoRow({
  icon: Icon,
  label,
  value,
  last = false,
}: {
  icon?: LucideIcon
  label: string
  value: string
  last?: boolean
}) {
  const colors = useThemeColors()
  return (
    <View className={`flex-row items-start gap-3 py-3 ${last ? '' : 'border-b border-border/60'}`}>
      {Icon ? (
        <View className="pt-0.5">
          <Icon size={18} color={colors.textMuted} />
        </View>
      ) : null}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </Text>
        <Text className="text-base text-foreground">{value}</Text>
      </View>
    </View>
  )
}

/** Uppercase caption above a group of cards. */
export function SectionLabel({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between px-1">
      <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {children}
      </Text>
      {action}
    </View>
  )
}

/** Square card thumbnail: the image when there is one, a tinted icon otherwise. */
export function Thumbnail({
  imageUrl,
  icon: Icon,
  size = 64,
}: {
  imageUrl?: string | null
  icon: LucideIcon
  size?: number
}) {
  const colors = useThemeColors()
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-2xl bg-primary/10"
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      ) : (
        <Icon size={Math.round(size * 0.4)} color={colors.primary} />
      )}
    </View>
  )
}
