import { PublicHomeAction } from './public-home-shared'

const principles = [
  {
    src: '/illustrations/principle-scope.png?v=2',
    alt: 'A site plan on a clipboard beside a rolled drawing',
    title: 'Scope the need first',
    text: 'Materials, equipment, and people belong on the project plan before anyone settles a final number.',
  },
  {
    src: '/illustrations/principle-plan-actual.png?v=2',
    alt: 'A pale plan card kept beside a teal record of actual cost',
    title: 'Keep plan and actual apart',
    text: 'The estimate stays next to recorded expenses, so the difference is visible instead of buried in a spreadsheet.',
  },
  {
    src: '/illustrations/principle-contact.png?v=2',
    alt: 'A supplier card beside a telephone handset',
    title: 'Leave the deal off-platform',
    text: 'Providers and workers are found here, then contacted directly. The app does not take orders, payments, or hires.',
  },
] as const

export function PrinciplesSection() {
  return (
    <section id="principles" aria-labelledby="principles-title" className="scroll-mt-6 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h2
            id="principles-title"
            className="max-w-sm text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Civil engineering principles
          </h2>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground sm:pt-2 sm:text-right">
            A simple order for civil work: decide the need, keep the estimate beside what was spent, and contact people
            directly.
          </p>
        </div>

        <div className="grid gap-12 md:grid-cols-3">
          {principles.map((item) => (
            <article key={item.title} className="flex flex-col items-center text-center">
              <img src={item.src} alt={item.alt} className="h-44 w-full object-contain" />
              <h3 className="mt-6 text-base font-semibold tracking-tight text-foreground">{item.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </div>

        <div className="flex justify-center">
          <PublicHomeAction showArrow />
        </div>
      </div>
    </section>
  )
}
