import { Fragment } from 'react'
import { Link } from 'react-router-dom'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

export type PageBreadcrumbItem = {
  label: string
  to?: string
}

type PageBreadcrumbsProps = {
  items: PageBreadcrumbItem[]
  className?: string
}

export function PageBreadcrumbs({ items, className }: PageBreadcrumbsProps) {
  return (
    <Breadcrumb className={cn('min-w-0', className)}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className="min-w-0">
                {isLast || !item.to ? (
                  <BreadcrumbPage className="max-w-[16rem] truncate sm:max-w-md">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="max-w-[16rem] truncate sm:max-w-md"
                    render={<Link to={item.to} />}
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
