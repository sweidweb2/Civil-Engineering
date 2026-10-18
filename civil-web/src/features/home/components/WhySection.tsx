import { CircleCheck } from 'lucide-react'

const whyProblems = [
  {
    title: 'Files live in different places',
    text: 'Drawings, supplier prices, and expense notes sit in separate folders, chats, and sheets.',
  },
  {
    title: 'The estimate gets overwritten',
    text: 'Planned cost and what was really spent end up in the same list, so the difference disappears.',
  },
  {
    title: 'People are hard to find again',
    text: 'Providers and workers are passed around by phone, with no shared place to look them up.',
  },
] as const

const whySolutions = [
  {
    title: 'One record for the job',
    text: 'Overview, documents, and references stay on the project they belong to.',
  },
  {
    title: 'Plan beside actual spend',
    text: 'Listed prices can be copied into the estimate, then real expenses stay next to that plan.',
  },
  {
    title: 'A directory, then a direct call',
    text: 'Find providers and workers here, then contact them yourself. No orders, payments, or hires.',
  },
] as const

export function WhySection() {
  return (
    <section id="why" aria-labelledby="why-title" className="scroll-mt-6 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="why-title" className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Why our app
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Civil project facts are easy to scatter. This workspace keeps the plan, the spend, and the people on one job.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl bg-white/55 p-6 sm:p-8">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">The problem</h3>
            <ol className="mt-6 flex flex-col gap-6">
              {whyProblems.map((item, index) => (
                <li key={item.title} className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="pt-0.5 text-xs font-medium text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </article>

          <article className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">The solution</h3>
            <ol className="mt-6 flex flex-col gap-6">
              {whySolutions.map((item, index) => (
                <li key={item.title} className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="pt-0.5 text-xs font-medium text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </div>
    </section>
  )
}
