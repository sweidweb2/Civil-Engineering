import { cn } from 'cn'
import type { ReactNode } from 'react'

import { PageBreadcrumbs, type PageBreadcrumbItem } from './page-breadcrumbs'

type PageHeaderProps = {
  title?: ReactNode
  description?: ReactNode
  breadcrumbs?: PageBreadcrumbItem[]
  actions?: ReactNode
  className?: string
}

function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  const hasTitle = title != null
  const hasDescription = description != null
  const showActionsWithTitle = Boolean(actions) && (hasTitle || hasDescription)

  return (
    <div data-slot="page-header" className={cn('mb-6 flex flex-col gap-3', className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <PageBreadcrumbs items={breadcrumbs} />
          {actions && !showActionsWithTitle ? (
            <div data-slot="page-header-actions" className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {hasTitle || hasDescription || showActionsWithTitle ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            {hasTitle ? (
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            ) : null}
            {hasDescription ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {showActionsWithTitle ? (
            <div data-slot="page-header-actions" className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { PageHeader }
export type { PageHeaderProps }
