import { StoreDownloadButton } from './public-home-shared'

function FlowRow({
  nodes,
  links,
  height,
}: {
  nodes: Array<{ x: number; y: number; teal?: boolean }>
  links: Array<[number, number]>
  height: number
}) {
  const radius = 7
  return (
    <svg viewBox={`0 0 280 ${height}`} className="mt-2 h-auto w-full rtl:-scale-x-100" aria-hidden>
      {links.map(([from, to]) => {
        const start = nodes[from]
        const end = nodes[to]
        const dx = end.x - start.x
        const dy = end.y - start.y
        const length = Math.hypot(dx, dy) || 1
        return (
          <line
            key={`${from}-${to}`}
            x1={start.x + (dx / length) * radius}
            y1={start.y + (dy / length) * radius}
            x2={end.x - (dx / length) * radius}
            y2={end.y - (dy / length) * radius}
            className="stroke-border"
            strokeWidth="1.25"
          />
        )
      })}
      {nodes.map((node, index) => (
        <circle
          key={index}
          cx={node.x}
          cy={node.y}
          r={radius}
          className={node.teal ? 'fill-primary stroke-primary' : 'fill-card stroke-border'}
          strokeWidth="1.25"
        />
      ))}
    </svg>
  )
}

function ProjectRecordArt() {
  const apart = [24, 78, 132, 186, 240].map((x) => ({ x, y: 16 }))
  const together = [
    { x: 24, y: 16 },
    { x: 78, y: 16 },
    { x: 132, y: 16, teal: true },
    { x: 186, y: 16 },
    { x: 240, y: 16, teal: true },
    { x: 78, y: 48 },
    { x: 132, y: 48, teal: true },
    { x: 186, y: 48 },
  ]
  return (
    <div className="rounded-xl bg-background px-4 py-5 ring-1 ring-foreground/10" aria-hidden>
      <p className="text-[11px] font-medium text-muted-foreground">Separate files</p>
      <FlowRow
        nodes={apart}
        links={[
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
        ]}
        height={32}
      />
      <p className="mt-4 text-[11px] font-medium text-muted-foreground">One project record</p>
      <FlowRow
        nodes={together}
        links={[
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [1, 5],
          [5, 6],
          [6, 7],
          [2, 6],
          [3, 7],
        ]}
        height={64}
      />
    </div>
  )
}

function PlanActualArt() {
  return (
    <div
      className="relative flex flex-col gap-3 rounded-xl bg-background p-4 ring-1 ring-foreground/10 sm:block"
      aria-hidden
    >
      <div className="rounded-lg bg-card p-4 ring-1 ring-foreground/10 sm:me-24">
        <p className="text-xs font-semibold text-foreground">Cost record</p>
        <div className="mt-3 flex flex-col gap-2">
          <div className="max-w-[15rem] rounded-lg bg-background px-3 py-2">
            <p className="text-[10px] font-medium text-muted-foreground">Plan</p>
            <p className="text-xs text-foreground">Listed prices for the job</p>
          </div>
          <div className="ms-6 max-w-[15rem] rounded-lg bg-primary/10 px-3 py-2">
            <p className="text-[10px] font-medium text-primary">Actual</p>
            <p className="text-xs text-foreground">Expenses recorded on site</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-full bg-background px-3 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
            Add an expense
          </span>
          <span className="size-5 shrink-0 rounded-full bg-primary" />
        </div>
      </div>
      <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10 sm:absolute sm:top-7 sm:end-3 sm:w-28">
        <p className="text-[10px] font-semibold text-foreground">This job</p>
        <div className="mt-2">
          <p className="text-[10px] text-muted-foreground">Plan</p>
          <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-background">
            <div className="h-full w-4/5 rounded-full bg-foreground/25" />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-[10px] text-muted-foreground">Actual</p>
          <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-background">
            <div className="h-full w-1/2 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  )
}

function DirectoryArt() {
  const bars = [
    { label: 'Materials', width: '82%' },
    { label: 'Equipment', width: '64%' },
    { label: 'Workers', width: '48%' },
  ]
  return (
    <div className="grid gap-6 sm:grid-cols-2" aria-hidden>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground">References on the job</p>
        <svg viewBox="0 0 180 88" className="mt-3 h-24 w-full">
          <line x1="16" y1="8" x2="16" y2="72" className="stroke-border" strokeWidth="1" />
          <line x1="16" y1="72" x2="172" y2="72" className="stroke-border" strokeWidth="1" />
          <polyline
            points="16,62 46,54 76,50 106,36 136,28 166,16"
            fill="none"
            className="stroke-primary"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground">In the directory</p>
        <div className="mt-3 flex flex-col gap-3">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{bar.label}</span>
              </div>
              <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full bg-primary" style={{ width: bar.width }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DeliversSection() {
  return (
    <section
      id="delivers"
      aria-labelledby="delivers-title"
      className="scroll-mt-6 border-b border-border bg-background"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="delivers-title"
            className="max-w-md text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            What this app delivers
          </h2>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground sm:text-end">
            One place for the project record, the estimate beside real spend, and the people a civil
            team looks up.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="flex flex-col rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
            <ProjectRecordArt />
            <h3 className="mt-6 text-base font-semibold tracking-tight text-foreground">
              Project records
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Overview, tasks, progress, documents, and photos stay on the job, with materials and
              people referenced inside it.
            </p>
          </article>

          <article className="flex flex-col rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
            <PlanActualArt />
            <h3 className="mt-6 text-base font-semibold tracking-tight text-foreground">
              Plan beside actual spend
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Listed prices can be copied into the estimate. Real expenses stay next to that plan,
              so the difference stays visible.
            </p>
          </article>
        </div>

        <article className="grid gap-8 rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8 lg:grid-cols-2">
          <div>
            <DirectoryArt />
            <h3 className="mt-6 text-base font-semibold tracking-tight text-foreground">
              Provider and worker directory
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Companies publish materials, equipment, and services. Workers share skills and how to
              reach them.
            </p>
          </div>
          <div className="flex flex-col gap-8 lg:pt-1">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                A directory, then a direct call
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Find providers and workers on the project, then contact them yourself. The app does
                not take orders, payments, or hires.
              </p>
            </div>
            <div className="flex w-full items-center justify-around gap-3">
              <StoreDownloadButton store="apple" />
              <StoreDownloadButton store="play" />
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
