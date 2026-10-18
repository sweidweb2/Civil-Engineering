import { StoreDownloadButton } from './public-home-shared'

export function PublicHero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="flex h-[calc(95vh-3.5rem)] max-h-[calc(95vh-3.5rem)] scroll-mt-6 flex-col overflow-hidden border-b border-border bg-background"
    >
      <div className="mx-auto flex w-full max-w-6xl shrink-0 flex-col items-center px-4 pt-12 text-center sm:px-6 sm:pt-16">
        <h1
          id="hero-title"
          className="max-w-5xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
        >
          The workspace for civil projects, costs, and the people who build them
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
          Plan what a project needs, record real expenses, and find providers and workers in one
          place — instead of scattered files and separate lists.
        </p>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
        <div className="mt-4 flex items-center justify-between gap-3">
          <StoreDownloadButton store="apple" />
          <StoreDownloadButton store="play" />
        </div>
        <div className="mt-6 flex min-h-0 flex-1 items-start justify-center lg:mt-3">
          <img
            src="/illustrations/hero-civil-platform.jpg?v=6"
            alt="Blueprints, cost sheets, and site records moving through one civil engineering workspace"
            className="max-h-full w-full object-contain object-top"
          />
        </div>
      </div>
    </section>
  )
}
