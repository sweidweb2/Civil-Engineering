import * as React from 'react'

import { cn } from '@/lib/utils'

/** Thin form shell used by auth pages. Field primitives live in `@/components/ui/field`. */
export function Form({ className, ...props }: React.ComponentProps<'form'>) {
  return <form data-slot="form" className={cn('flex flex-col gap-6', className)} {...props} />
}
