import { useTranslation } from 'react-i18next'

import type { AuthRole } from '@/services/auth'
import type { UserRoleCounts } from '@/services/users'

const ROLE_ORDER: AuthRole[] = ['SUPER', 'ADMIN', 'MANAGER', 'PROVIDER', 'WORKER', 'CLIENT']

type RoleBarChartProps = {
  counts: UserRoleCounts
}

export function RoleBarChart({ counts }: RoleBarChartProps) {
  const { t } = useTranslation('admin')
  const items = ROLE_ORDER.map((role) => ({
    role,
    count: counts[role],
  })).filter((item) => item.count > 0)

  const width = 520
  const rowH = 22
  const pad = { top: 8, right: 28, bottom: 8, left: 108 }
  const height = pad.top + pad.bottom + Math.max(items.length, 1) * rowH
  const innerW = width - pad.left - pad.right
  const max = Math.max(...items.map((item) => item.count), 1)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-36 w-full text-primary"
      role="img"
      aria-label={t('users.usersByRoleAria')}
    >
      {items.length === 0 ? (
        <text x={pad.left} y={pad.top + 14} className="fill-muted-foreground" fontSize="11">
          {t('users.noUsersYet')}
        </text>
      ) : null}
      {items.map((item, index) => {
        const y = pad.top + index * rowH
        const barW = (item.count / max) * innerW
        return (
          <g key={item.role}>
            <text
              x={pad.left - 8}
              y={y + 13}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize="9"
            >
              {t(`roles.${item.role}`)}
            </text>
            <rect
              x={pad.left}
              y={y + 4}
              width={Math.max(barW, 2)}
              height={12}
              rx="3"
              className="fill-current"
            />
            <text
              x={pad.left + Math.max(barW, 2) + 6}
              y={y + 13}
              className="fill-muted-foreground"
              fontSize="9"
            >
              {item.count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
