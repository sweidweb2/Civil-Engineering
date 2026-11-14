import { useTranslation } from 'react-i18next'

import type { AuthRole } from '@/services/auth'
import type { UserRoleCounts } from '@/services/users'
import { useIsRtl } from '@/stores/localeStore'

const ROLE_ORDER: AuthRole[] = ['SUPER', 'ADMIN', 'MANAGER', 'PROVIDER', 'WORKER', 'CLIENT']

type RoleBarChartProps = {
  counts: UserRoleCounts
}

export function RoleBarChart({ counts }: RoleBarChartProps) {
  const { t } = useTranslation('admin')
  const isRtl = useIsRtl()
  const items = ROLE_ORDER.map((role) => ({
    role,
    count: counts[role],
  })).filter((item) => item.count > 0)

  const width = 520
  const rowH = 22
  const labelPad = 108
  const valuePad = 28
  const pad = {
    top: 8,
    bottom: 8,
    start: isRtl ? valuePad : labelPad,
    end: isRtl ? labelPad : valuePad,
  }
  const height = pad.top + pad.bottom + Math.max(items.length, 1) * rowH
  const innerW = width - pad.start - pad.end
  const max = Math.max(...items.map((item) => item.count), 1)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-36 w-full text-primary"
      role="img"
      aria-label={t('users.usersByRoleAria')}
    >
      {items.length === 0 ? (
        <text
          x={isRtl ? width - pad.end : pad.start}
          y={pad.top + 14}
          textAnchor={isRtl ? 'end' : 'start'}
          className="fill-muted-foreground"
          fontSize="11"
        >
          {t('users.noUsersYet')}
        </text>
      ) : null}
      {items.map((item, index) => {
        const y = pad.top + index * rowH
        const barW = Math.max((item.count / max) * innerW, 2)
        const barX = isRtl ? width - pad.end - barW : pad.start
        const labelX = isRtl ? width - pad.end + 8 : pad.start - 8
        const valueX = isRtl ? barX - 6 : barX + barW + 6
        return (
          <g key={item.role}>
            <text
              x={labelX}
              y={y + 13}
              textAnchor={isRtl ? 'start' : 'end'}
              className="fill-muted-foreground"
              fontSize="9"
            >
              {t(`roles.${item.role}`)}
            </text>
            <rect x={barX} y={y + 4} width={barW} height={12} rx="3" className="fill-current" />
            <text
              x={valueX}
              y={y + 13}
              textAnchor={isRtl ? 'end' : 'start'}
              className="fill-muted-foreground"
              fontSize="9"
              direction="ltr"
            >
              {item.count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
