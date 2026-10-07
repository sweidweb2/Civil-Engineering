import type { ReactNode } from 'react'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

type DataPanelProps = {
  toolbar?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

/** Shared 30% surface (card) on the 60% page canvas. */
export function DataPanel({ toolbar, footer, children }: DataPanelProps) {
  return (
    <Card size="sm" className="min-w-0 gap-0 py-0">
      {toolbar ? <CardHeader className="border-b border-border py-3">{toolbar}</CardHeader> : null}
      <CardContent className="min-w-0 p-0">{children}</CardContent>
      {footer ? <CardFooter className="justify-between bg-card">{footer}</CardFooter> : null}
    </Card>
  )
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>
}

/** Shared 30% surface for tabs / filters sitting on the 60% page canvas. */
export function ToolbarCard({ children }: { children: ReactNode }) {
  return (
    <Card size="sm" className="min-w-0 py-3">
      <CardContent className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </CardContent>
    </Card>
  )
}
