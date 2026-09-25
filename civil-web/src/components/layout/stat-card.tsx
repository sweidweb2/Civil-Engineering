import type { LucideIcon } from 'lucide-react'

import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export const STAT_GRID_CLASS = 'grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4'

type StatCardProps = {
  label: string
  value: string | number
  icon: LucideIcon
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">{label}</p>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
        </div>
        <CardTitle className="truncate text-2xl font-semibold tabular-nums text-primary">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}
