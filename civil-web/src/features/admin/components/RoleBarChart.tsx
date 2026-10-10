import type { AuthRole } from '@/services/auth'

import type { AdminUserRow } from '../admin.types'
import { roleLabel } from '../usersStore'

const ROLE_ORDER: AuthRole[] = ['SUPER', 'ADMIN', 'MANAGER', 'PROVIDER', 'WORKER', 'CLIENT']

type RoleBarChartProps = {
  rows: AdminUserRow[]
}

export function RoleBarChart({ rows }: RoleBarChartProps) {
  const counts = ROLE_ORDER.map((role) => ({
    role,
    count: rows.filter((row) => row.role === role).length,
  })).filter((item) => item.count > 0)

  const width = 520
  const rowH = 22
  const pad = { top: 8, right: 28, bottom: 8, left: 108 }
  const height = pad.top + pad.bottom + Math.max(counts.length, 1) * rowH
  const innerW = width - pad.left - pad.right
  const max = Math.max(...counts.map((item) => item.count), 1)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-36 w-full text-primary"
      role="img"
      aria-label="Users by role"
    >
      {counts.map((item, index) => {
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
              {roleLabel(item.role)}
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
