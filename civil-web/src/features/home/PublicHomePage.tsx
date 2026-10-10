import {
  ArrowRight,
  CircleCheck,
  FolderKanban,
  LayoutDashboard,
  LogIn,
  Receipt,
  Store,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { homePathForRole } from '@/lib/homePath'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

function SectionHeading({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 id={id} className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">{text}</p>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  title,
  text,
  quiet = false,
}: {
  icon: LucideIcon
  title: string
  text: string
  quiet?: boolean
}) {
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-xl p-6 ring-1 ring-foreground/10',
        quiet ? 'bg-muted/70' : 'bg-card',
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  )
}

function PublicHomeAction({
  className,
  showArrow = false,
}: {
  className?: string
  showArrow?: boolean
}) {
  const user = useAuthStore((s) => s.user)
  const portalPath = user ? homePathForRole(user.role) : null
  const isSignedIn = Boolean(user && portalPath && portalPath !== '/')

  if (isSignedIn && portalPath) {
    return (
      <Link to={portalPath} className={cn(buttonVariants(), className)}>
        {showArrow ? null : <LayoutDashboard />}
        Dashboard
        {showArrow ? <ArrowRight /> : null}
      </Link>
    )
  }

  if (user) return null

  return (
    <Link to="/login" className={cn(buttonVariants(), className)}>
      {showArrow ? null : <LogIn />}
      Sign in
      {showArrow ? <ArrowRight /> : null}
    </Link>
  )
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 bg-background">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-tight text-foreground">Civil Engineering</p>
        <PublicHomeAction />
      </div>
    </header>
  )
}

function PublicHero() {
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
        <PublicHomeAction showArrow className="mt-5" />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 items-start justify-center px-4 sm:px-6">
        <img
          src="/illustrations/hero-civil-platform.jpg?v=6"
          alt="Blueprints, cost sheets, and site records moving through one civil engineering workspace"
          className="max-h-full w-full max-w-5xl object-contain object-top"
        />
      </div>
    </section>
  )
}

const principles = [
  {
    src: '/illustrations/principle-scope.png?v=1',
    alt: 'A site plan on a clipboard beside a rolled drawing',
    title: 'Scope the need first',
    text: 'Materials, equipment, and people belong on the project plan before anyone settles a final number.',
  },
  {
    src: '/illustrations/principle-plan-actual.png?v=1',
    alt: 'A pale plan card kept beside a teal record of actual cost',
    title: 'Keep plan and actual apart',
    text: 'The estimate stays next to recorded expenses, so the difference is visible instead of buried in a spreadsheet.',
  },
  {
    src: '/illustrations/principle-contact.png?v=1',
    alt: 'A supplier card beside a telephone handset',
    title: 'Leave the deal off-platform',
    text: 'Providers and workers are found here, then contacted directly. The app does not take orders, payments, or hires.',
  },
] as const

function PrinciplesSection() {
  return (
    <section id="principles" aria-labelledby="principles-title" className="scroll-mt-6 border-b border-border bg-[#EBD9C3]">
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

function DeliversSection() {
  return (
    <section id="delivers" aria-labelledby="delivers-title" className="scroll-mt-6 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          id="delivers-title"
          title="What this app delivers"
          text="One place for the project record and the directories a civil team uses while planning it."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard
            quiet
            icon={FolderKanban}
            title="Project records"
            text="Overview, tasks, progress, documents, and photos stay on the project, with materials, equipment, and workers referenced inside it."
          />
          <InfoCard
            quiet
            icon={Receipt}
            title="Cost and expenses"
            text="Snapshot listed prices into the plan, then record real expenses and compare planned cost with what was spent."
          />
          <InfoCard
            quiet
            icon={Store}
            title="Provider directory"
            text="Companies publish materials, equipment, and services with prices and contact details for planning and reference."
          />
          <InfoCard
            quiet
            icon={Users}
            title="Worker profiles"
            text="Verified professionals share skills, rates, and how to reach them. A project can reference them without hiring them here."
          />
        </div>
      </div>
    </section>
  )
}

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

function WhySection() {
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

function UnifiedSection() {
  const scattered = ['Drawings in one folder', 'Supplier prices in another', 'Wages in a notebook', 'Expenses in chat']
  const unified = ['One project overview', 'Planned cost beside actual cost', 'Providers and workers on the record', 'Documents kept with the job']

  return (
    <section id="unified" aria-labelledby="unified-title" className="scroll-mt-6 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          id="unified-title"
          title="From fragmented data into unified data"
          text="The same facts stop living in separate files. They sit on the project they belong to."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl bg-muted/70 p-6 sm:p-8">
            <h3 className="text-sm font-semibold tracking-tight text-muted-foreground">Scattered</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {scattered.map((item) => (
                <li key={item} className="text-base text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-xl bg-primary p-6 text-primary-foreground sm:p-8">
            <h3 className="text-sm font-semibold tracking-tight text-primary-foreground/80">One record</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {unified.map((item) => (
                <li key={item} className="text-base">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section id="cta" aria-labelledby="cta-title" className="scroll-mt-6 border-b border-border bg-background">
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

function PublicFooter() {
  return (
    <footer className="bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold tracking-tight">Civil Engineering</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            A workspace for civil projects, costs, providers, and workers.
          </p>
        </div>
        <Separator />
        <p className="text-xs text-muted-foreground">Civil engineering, kept in one record.</p>
      </div>
    </footer>
  )
}

export function PublicHomePage() {
  useDocumentTitle('Civil Engineering')

  return (
    <div className="home-canvas min-h-svh bg-background text-foreground">
      <PublicHeader />
      <main>
        <PublicHero />
        <PrinciplesSection />
        <DeliversSection />
        <WhySection />
        <UnifiedSection />
        <CtaSection />
      </main>
      <PublicFooter />
    </div>
  )
}
