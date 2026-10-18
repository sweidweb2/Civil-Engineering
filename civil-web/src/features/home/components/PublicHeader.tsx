import { PublicHomeAction } from './public-home-shared'

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 bg-background">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-tight text-foreground">Civil Engineering</p>
        <PublicHomeAction />
      </div>
    </header>
  )
}
