import type { ReactNode } from 'react'

type StageSectionProps = {
  title: string
  children: ReactNode
}

export function StageSection({ title, children }: StageSectionProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <h4 className="text-sm font-semibold tracking-tight text-foreground">{title}</h4>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
