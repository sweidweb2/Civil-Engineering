import * as React from 'react'
import { cn } from 'cn'

function Table({
  className,
  startIndex = 0,
  indexVariant = 'badge',
  style,
  ...props
}: React.ComponentProps<'table'> & { startIndex?: number; indexVariant?: 'badge' | 'plain' }) {
  return (
    <div data-slot="table-container" className="relative w-full min-w-0 overflow-x-auto">
      <table
        data-slot="table"
        data-index={indexVariant}
        className={cn('w-full caption-bottom text-base', className)}
        style={{ '--table-index-start': startIndex, ...style } as React.CSSProperties}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({
  className,
  clickable = false,
  ...props
}: React.ComponentProps<'tr'> & { clickable?: boolean }) {
  return (
    <tr
      data-slot="table-row"
      data-clickable={clickable ? 'true' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted',
        clickable &&
          'cursor-pointer hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-12 px-3 text-start align-middle text-sm font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pe-0',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'px-3 py-3.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0',
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow }
