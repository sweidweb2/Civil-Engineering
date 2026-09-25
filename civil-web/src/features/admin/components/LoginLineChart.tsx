import type { LoginDayPoint } from '../admin.types'

type LoginLineChartProps = {
  points: LoginDayPoint[]
}

export function LoginLineChart({ points }: LoginLineChartProps) {
  const width = 520
  const height = 140
  const pad = { top: 12, right: 8, bottom: 24, left: 28 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = Math.max(...points.map((p) => p.count), 1)

  const coords = points.map((p, i) => {
    const x = pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
    const y = pad.top + innerH - (p.count / max) * innerH
    return { x, y, label: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
  })

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-36 w-full text-primary"
      role="img"
      aria-label="Daily logins for the last two weeks"
    >
      <line
        x1={pad.left}
        y1={pad.top + innerH}
        x2={pad.left + innerW}
        y2={pad.top + innerH}
        className="stroke-border"
        strokeWidth="1"
      />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {coords.map((c) => (
        <circle key={`${c.x}-${c.y}`} cx={c.x} cy={c.y} r="2.5" fill="currentColor" />
      ))}
      {coords.filter((_, i) => i % 2 === 0).map((c) => (
        <text
          key={c.label}
          x={c.x}
          y={height - 4}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="9"
        >
          {c.label}
        </text>
      ))}
    </svg>
  )
}
