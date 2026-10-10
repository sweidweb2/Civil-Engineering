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

import { Button, buttonVariants } from '@/components/ui/button'
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

function AppleStoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 text-primary" aria-hidden>
      <path
        fill="currentColor"
        d="M16.37 12.72c-.03-2.35 1.92-3.48 2.01-3.53-1.1-1.61-2.81-1.83-3.41-1.85-1.45-.15-2.84.86-3.58.86-.74 0-1.88-.84-3.09-.82-1.59.03-3.06.93-3.88 2.36-1.66 2.88-.42 7.14 1.19 9.48.79 1.14 1.73 2.42 2.96 2.37 1.19-.05 1.64-.77 3.08-.77 1.43 0 1.84.77 3.09.74 1.28-.02 2.09-1.16 2.87-2.31.9-1.32 1.27-2.6 1.29-2.67-.03-.01-2.48-.95-2.51-3.86zM14.58 6.39c.65-.79 1.09-1.89.97-2.99-1 .04-2.21.67-2.93 1.46-.64.74-1.2 1.86-1.05 2.95 1.11.09 2.25-.57 3.01-1.42z"
      />
    </svg>
  )
}

function PlayStoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 text-primary" aria-hidden>
      <path
        fill="currentColor"
        d="M4.4 3.55v16.9c0 .86.94 1.39 1.68.94l13.55-8.45c.7-.44.7-1.44 0-1.88L6.08 2.61c-.74-.45-1.68.08-1.68.94z"
      />
    </svg>
  )
}

function StoreDownloadButton({ store }: { store: 'apple' | 'play' }) {
  const isApple = store === 'apple'
  const storeName = isApple ? 'App Store' : 'Play Store'

  return (
    <span title="Not available yet" className="inline-flex">
      <Button
        type="button"
        variant="outline"
        disabled
        aria-label={`Download the app from the ${storeName}. Not available yet.`}
        className="h-auto cursor-not-allowed gap-3 rounded-xl bg-card px-4 py-2.5 text-left shadow-sm disabled:opacity-70"
      >
        {isApple ? <AppleStoreIcon /> : <PlayStoreIcon />}
        <span className="flex flex-col leading-none">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">Download from</span>
          <span className="mt-1 text-base font-semibold text-foreground">{storeName}</span>
        </span>
      </Button>
    </span>
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

type Particle = { x: number; y: number; r: number; opacity: number }

function particleRandom(seed: number) {
  let value = seed
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function scatteredParticles(): Particle[] {
  const random = particleRandom(11)
  return Array.from({ length: 72 }, () => ({
    x: 18 + random() * 284,
    y: 14 + random() * 154,
    r: 1.15 + random() * 2.1,
    opacity: 0.28 + random() * 0.62,
  }))
}

function clusteredParticles(): Particle[] {
  const random = particleRandom(29)
  const groups = [
    { x: 72, y: 98, spread: 52, count: 34 },
    { x: 168, y: 78, spread: 36, count: 42 },
    { x: 250, y: 108, spread: 44, count: 32 },
  ]
  return groups.flatMap((group) =>
    Array.from({ length: group.count }, () => {
      const angle = random() * Math.PI * 2
      const distance = Math.pow(random(), 0.65) * group.spread
      return {
        x: group.x + Math.cos(angle) * distance,
        y: group.y + Math.sin(angle) * distance * 0.82,
        r: 1.2 + random() * 2,
        opacity: 0.4 + random() * 0.55,
      }
    }),
  )
}

function networkParticles() {
  const count = 58
  const golden = Math.PI * (3 - Math.sqrt(5))
  const nodes = Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / (count - 1)) * 2
    const radius = Math.sqrt(1 - y * y)
    const theta = golden * index
    return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius }
  })
  const links: Array<[number, number]> = []
  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const dz = nodes[i].z - nodes[j].z
      if (dx * dx + dy * dy + dz * dz < 0.34) links.push([i, j])
    }
  }
  const project = (node: (typeof nodes)[number]) => ({
    x: 160 + (node.x + node.z * 0.28) * 78,
    y: 92 + node.y * 72,
    r: 1.5 + (node.z + 1) * 0.7,
    opacity: 0.45 + (node.z + 1) * 0.25,
  })
  return { nodes: nodes.map(project), links, raw: nodes }
}

const unifiedStages = [
  {
    number: '01',
    title: 'Scattered files',
    text: 'Drawings, supplier prices, wage notes, and expense messages each live somewhere else.',
    art: 'scattered' as const,
  },
  {
    number: '02',
    title: 'Facts start to meet',
    text: 'The estimate, what was spent, and the people on a job begin to sit next to each other.',
    art: 'clustered' as const,
  },
  {
    number: '03',
    title: 'One project record',
    text: 'Plan, actual cost, providers, workers, and documents stay on the same job.',
    art: 'unified' as const,
  },
]

function UnifiedArt({ kind }: { kind: (typeof unifiedStages)[number]['art'] }) {
  if (kind === 'unified') {
    const { nodes, links, raw } = networkParticles()
    return (
      <svg viewBox="0 0 320 180" className="h-40 w-full text-primary" aria-hidden>
        {links.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={nodes[from].x}
            y1={nodes[from].y}
            x2={nodes[to].x}
            y2={nodes[to].y}
            stroke="currentColor"
            strokeWidth="0.6"
            opacity={0.22 + ((raw[from].z + raw[to].z + 2) / 4) * 0.35}
          />
        ))}
        {nodes.map((node, index) => (
          <circle key={index} cx={node.x} cy={node.y} r={node.r} fill="currentColor" opacity={node.opacity} />
        ))}
      </svg>
    )
  }

  const particles = kind === 'scattered' ? scatteredParticles() : clusteredParticles()
  return (
    <svg viewBox="0 0 320 180" className="h-40 w-full text-primary" aria-hidden>
      {particles.map((particle, index) => (
        <circle
          key={index}
          cx={particle.x}
          cy={particle.y}
          r={particle.r}
          fill="currentColor"
          opacity={particle.opacity}
        />
      ))}
    </svg>
  )
}

function UnifiedSection() {
  return (
    <section id="unified" aria-labelledby="unified-title" className="scroll-mt-6 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          id="unified-title"
          title="From fragmented data into unified data"
          text="The same facts stop living in separate files. They sit on the project they belong to."
        />
        <div className="grid md:grid-cols-3">
          {unifiedStages.map((stage, index) => (
            <article
              key={stage.number}
              className={cn(
                'flex flex-col',
                index > 0 && 'mt-10 border-t border-border pt-10 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-8',
                index < unifiedStages.length - 1 && 'md:pr-8',
              )}
            >
              <p className="text-xs font-medium tracking-wide text-muted-foreground">{stage.number}</p>
              <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">{stage.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{stage.text}</p>
              <div className="mt-8">
                <UnifiedArt kind={stage.art} />
              </div>
            </article>
          ))}
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
