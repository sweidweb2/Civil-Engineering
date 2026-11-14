import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type StageInputWithUnitProps = React.ComponentProps<typeof Input> & {
  unit: string
}

export function StageInputWithUnit({ unit, className, ...props }: StageInputWithUnitProps) {
  return (
    <div className="relative">
      <Input className={cn('pe-12', className)} {...props} />
      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted-foreground">
        {unit}
      </span>
    </div>
  )
}
