import { PublicHomeAction } from './public-home-shared'

export function CtaSection() {
  return (
    <section id="cta" aria-labelledby="cta-title" className="relative scroll-mt-6 overflow-hidden border-b border-border bg-background">
      <img
        src="/illustrations/cta-civil-sketch.png?v=2"
        alt="A sketched figure holding a line up to a bridge truss"
        className="pointer-events-none absolute top-1/2 left-16 hidden w-72 -translate-y-1/2 xl:block"
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6">
        <h2 id="cta-title" className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Open the project workspace
        </h2>
        <p className="mt-4 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
          Sign in to plan a project, publish what you supply, or look through the directory.
        </p>
        <PublicHomeAction showArrow className="mt-8" />
      </div>
    </section>
  )
}
