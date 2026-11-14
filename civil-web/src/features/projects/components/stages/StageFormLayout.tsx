import type { ReactNode } from 'react'

type StageFormLayoutProps = {
  children: ReactNode
  sidebar: ReactNode
}

/** Main fields + sticky file sidebar with cover cards. */
export function StageFormLayout({ children, sidebar }: StageFormLayoutProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-4">{children}</div>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">{sidebar}</aside>
    </div>
  )
}
