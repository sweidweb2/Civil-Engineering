import { cn } from 'cn'

type LoaderGridProps = {
  className?: string
}

function LoaderGrid({ className }: LoaderGridProps) {
  return (
    <div
      data-slot="loader-grid"
      className={cn('loader-grid relative h-[2.5em] w-[2.5em] rotate-[165deg]', className)}
      role="status"
      aria-label="Loading"
    >
      <span className="beforeEl" />
      <span className="afterEl" />
    </div>
  )
}

export { LoaderGrid }
export default LoaderGrid
