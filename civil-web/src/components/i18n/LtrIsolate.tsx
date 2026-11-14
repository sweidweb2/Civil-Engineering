import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type LtrIsolateProps = {
  children?: ReactNode
  className?: string
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'className' | 'dir'>

/** Isolate LTR tokens (email, phone, URL, IDs) inside RTL UI. */
export function LtrIsolate({ children, className, ...props }: LtrIsolateProps) {
  return (
    <span dir="ltr" className={cn('[unicode-bidi:isolate]', className)} {...props}>
      {children}
    </span>
  )
}
