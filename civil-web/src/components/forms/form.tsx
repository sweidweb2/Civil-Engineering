import * as React from 'react'
import { cn } from 'cn'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'

/**
 * Domain-agnostic form shell. Field* primitives live in `@/components/ui/field`
 * (source of truth); this module re-exports them with a thin `<Form>` wrapper.
 */
function Form({ className, ...props }: React.ComponentProps<'form'>) {
  return <form data-slot="form" className={cn('flex flex-col gap-6', className)} {...props} />
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
  Form,
}
