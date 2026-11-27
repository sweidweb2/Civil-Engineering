import { View } from 'react-native'
import type { ReactElement } from 'react'
import Svg, { G, Path, Rect } from 'react-native-svg'

import { useWkPalette } from '@/components/wk/palette'
import type { AuthRole } from '@/services/auth'

type Tone = { face: string; side: string; top: string; accent: string; ink: string }

/** Soft isometric palette keyed to portal brand greens / neutrals. */
function useTone(): Tone {
  const { c, isDark } = useWkPalette()
  return {
    face: isDark ? '#2A3D32' : '#D7E8DC',
    side: isDark ? '#1D3127' : '#B8D2C0',
    top: isDark ? '#3A5546' : '#EAF4EE',
    accent: c.brand,
    ink: isDark ? c.lime : c.hero,
  }
}

/** Shared ground diamond under every role drawing. */
function Ground({ tone }: { tone: Tone }) {
  return <Path d="M60 108 L110 84 L160 108 L110 132 Z" fill={tone.side} opacity={0.55} />
}

/** Isometric box: `ox,oy` is the front-left ground corner. */
function IsoBox({
  ox,
  oy,
  w,
  d,
  h,
  tone,
}: {
  ox: number
  oy: number
  w: number
  d: number
  h: number
  tone: Tone
}) {
  const x = (dx: number, dy: number) => ox + dx - dy
  const y = (dx: number, dy: number, dz: number) => oy + (dx + dy) * 0.5 - dz
  const front = `M${x(0, 0)} ${y(0, 0, 0)} L${x(w, 0)} ${y(w, 0, 0)} L${x(w, 0)} ${y(w, 0, h)} L${x(0, 0)} ${y(0, 0, h)} Z`
  const right = `M${x(w, 0)} ${y(w, 0, 0)} L${x(w, d)} ${y(w, d, 0)} L${x(w, d)} ${y(w, d, h)} L${x(w, 0)} ${y(w, 0, h)} Z`
  const top = `M${x(0, 0)} ${y(0, 0, h)} L${x(w, 0)} ${y(w, 0, h)} L${x(w, d)} ${y(w, d, h)} L${x(0, d)} ${y(0, d, h)} Z`
  return (
    <G>
      <Path d={front} fill={tone.face} />
      <Path d={right} fill={tone.side} />
      <Path d={top} fill={tone.top} />
    </G>
  )
}

function WorkerArt({ tone }: { tone: Tone }) {
  return (
    <G>
      <Ground tone={tone} />
      <IsoBox ox={78} oy={112} w={36} d={28} h={18} tone={tone} />
      <Path d="M92 62 C92 48 128 48 128 62 L132 70 L88 70 Z" fill={tone.accent} />
      <Path d="M86 70 L134 70 L130 76 L90 76 Z" fill={tone.ink} opacity={0.85} />
      <Path d="M98 76 L122 76 L126 108 L94 108 Z" fill={tone.face} />
      <Path d="M122 76 L130 80 L132 110 L126 108 Z" fill={tone.side} />
      <Rect
        x={132}
        y={88}
        width={18}
        height={5}
        rx={1.5}
        fill={tone.ink}
        transform="rotate(-18 132 88)"
      />
      <Path d="M148 82 L156 78 L158 86 L150 90 Z" fill={tone.accent} />
    </G>
  )
}

function ProviderArt({ tone }: { tone: Tone }) {
  return (
    <G>
      <Ground tone={tone} />
      <IsoBox ox={58} oy={118} w={52} d={40} h={42} tone={tone} />
      <Path d="M58 76 L110 50 L162 76 L110 102 Z" fill={tone.accent} opacity={0.9} />
      <Path d="M92 118 L108 110 L108 88 L92 96 Z" fill={tone.ink} opacity={0.55} />
      <IsoBox ox={128} oy={124} w={22} d={18} h={16} tone={{ ...tone, top: tone.accent }} />
    </G>
  )
}

function ManagerArt({ tone }: { tone: Tone }) {
  return (
    <G>
      <Ground tone={tone} />
      <IsoBox ox={70} oy={116} w={44} d={34} h={36} tone={tone} />
      <Path d="M148 118 L148 42" stroke={tone.ink} strokeWidth={3} strokeLinecap="round" />
      <Path d="M148 42 L96 42" stroke={tone.accent} strokeWidth={3} strokeLinecap="round" />
      <Path d="M112 42 L112 58" stroke={tone.ink} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M104 58 L120 58 L112 68 Z" fill={tone.accent} />
      <Path d="M82 96 L108 83 L108 90 L82 103 Z" fill={tone.ink} opacity={0.35} />
      <Path d="M82 108 L108 95 L108 102 L82 115 Z" fill={tone.ink} opacity={0.35} />
    </G>
  )
}

function ClientArt({ tone }: { tone: Tone }) {
  return (
    <G>
      <Ground tone={tone} />
      <IsoBox ox={74} oy={116} w={40} d={32} h={28} tone={tone} />
      <Path d="M74 88 L114 68 L154 88 L114 108 Z" fill={tone.accent} />
      <Path d="M96 116 L108 110 L108 96 L96 102 Z" fill={tone.ink} opacity={0.5} />
      <IsoBox
        ox={118}
        oy={86}
        w={10}
        d={10}
        h={14}
        tone={{ ...tone, face: tone.ink, side: tone.ink }}
      />
    </G>
  )
}

function AdminArt({ tone }: { tone: Tone }) {
  return (
    <G>
      <Ground tone={tone} />
      <IsoBox ox={66} oy={118} w={48} d={36} h={20} tone={tone} />
      <Path
        d="M110 48 C128 52 138 62 138 78 C138 96 118 110 110 116 C102 110 82 96 82 78 C82 62 92 52 110 48 Z"
        fill={tone.accent}
      />
      <Path
        d="M110 58 C122 61 128 68 128 78 C128 90 116 100 110 104 C104 100 92 90 92 78 C92 68 98 61 110 58 Z"
        fill={tone.top}
        opacity={0.9}
      />
      <Path d="M110 70 L110 92" stroke={tone.ink} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M100 80 L120 80" stroke={tone.ink} strokeWidth={2.4} strokeLinecap="round" />
    </G>
  )
}

function SuperArt({ tone }: { tone: Tone }) {
  return (
    <G>
      <Ground tone={tone} />
      <IsoBox ox={78} oy={118} w={36} d={28} h={34} tone={tone} />
      <Path d="M86 64 L98 48 L110 60 L122 48 L134 64 L130 78 L90 78 Z" fill={tone.accent} />
      <Path d="M98 48 L98 42" stroke={tone.ink} strokeWidth={2} strokeLinecap="round" />
      <Path d="M110 60 L110 44" stroke={tone.ink} strokeWidth={2} strokeLinecap="round" />
      <Path d="M122 48 L122 42" stroke={tone.ink} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M110 96 C116 96 120 100 120 105 C120 110 116 114 110 114 C104 114 100 110 100 105 C100 100 104 96 110 96 Z M108 114 L112 114 L112 126 L108 126 Z"
        fill={tone.ink}
        opacity={0.55}
      />
    </G>
  )
}

const ART: Record<AuthRole, (props: { tone: Tone }) => ReactElement> = {
  WORKER: WorkerArt,
  PROVIDER: ProviderArt,
  MANAGER: ManagerArt,
  CLIENT: ClientArt,
  ADMIN: AdminArt,
  SUPER: SuperArt,
}

/** Expressive isometric vignette for an admin user-role category card. */
export function UserRoleIsoArt({ role }: { role: AuthRole }) {
  const tone = useTone()
  const { c } = useWkPalette()
  const Art = ART[role]
  const fullTone: Tone = {
    ...tone,
    accent: role === 'SUPER' ? c.lime : tone.accent,
  }

  return (
    <View className="aspect-[5/4] items-center justify-center overflow-hidden bg-wk-sf2">
      <Svg width="100%" height="100%" viewBox="0 0 220 150" preserveAspectRatio="xMidYMid meet">
        <Art tone={fullTone} />
      </Svg>
    </View>
  )
}
