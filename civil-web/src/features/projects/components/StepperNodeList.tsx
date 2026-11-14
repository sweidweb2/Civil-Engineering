import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProjectStepNode } from '@/services/project-steppers'

import { resolveNodePhase, stepperColumnWidthRem } from '../lib/stepper-values'

type StepperNodeListProps = {
  nodes: ProjectStepNode[]
  selectedId: string | null
  onSelect: (nodeId: string) => void
}

export function StepperNodeList({ nodes, selectedId, onSelect }: StepperNodeListProps) {
  const { t } = useTranslation(['projects', 'common'])
  const selectedIndex = selectedId ? nodes.findIndex((item) => item.id === selectedId) : -1

  return (
    <div className="overflow-x-auto pb-2 pt-2">
      <ol
        className="mx-auto flex w-max"
        style={{
          ['--stepper-col' as string]: `${stepperColumnWidthRem(nodes.length)}rem`,
        }}
      >
        {nodes.map((node, index) => {
          const phase = resolveNodePhase(nodes, node.id)
          const isSelected = node.id === selectedId
          // Line after this node fills when step is done or user moved past it.
          const lineFilled =
            index < nodes.length - 1 &&
            (node.isComplete || (selectedIndex >= 0 && selectedIndex > index))

          return (
            <li
              key={node.id}
              className="relative flex w-(--stepper-col) shrink-0 flex-col items-center"
            >
              {index < nodes.length - 1 ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-7 left-1/2 z-0 h-0.5 w-full overflow-hidden rounded-full bg-border"
                >
                  <div
                    className={cn(
                      'h-full origin-left rounded-full bg-primary transition-transform duration-500 ease-out',
                      lineFilled ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => onSelect(node.id)}
                aria-current={isSelected ? 'step' : undefined}
                className={cn(
                  'group relative z-10 flex w-full flex-col items-center gap-2.5 rounded-xl px-1.5 py-1 text-center outline-none',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <span
                  className={cn(
                    'relative flex size-12 items-center justify-center rounded-full border-2 text-base font-semibold transition-all duration-300 ease-out',
                    phase === 'done' &&
                      'border-primary bg-primary text-primary-foreground shadow-sm',
                    phase === 'current' &&
                      'scale-110 border-primary bg-background text-primary shadow-[0_0_0_4px] shadow-primary/20',
                    phase === 'upcoming' &&
                      'border-muted-foreground/30 bg-muted text-muted-foreground group-hover:border-primary/50 group-hover:text-foreground',
                    isSelected && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
                  )}
                >
                  {phase === 'done' ? (
                    <Check className="size-5 transition-transform duration-300" strokeWidth={2.5} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={cn(
                      'truncate text-sm font-semibold leading-tight transition-colors duration-300',
                      phase === 'upcoming' && !isSelected
                        ? 'text-muted-foreground'
                        : 'text-foreground',
                    )}
                    title={node.name}
                  >
                    {node.name}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {node.inputCount === 0
                      ? t('projects:noInputs')
                      : `${node.filledCount}/${node.inputCount} filled`}
                  </span>
                  {phase === 'done' ? (
                    <Badge variant="secondary" className="mx-auto h-5 px-1.5 text-[10px]">
                      Done
                    </Badge>
                  ) : phase === 'current' ? (
                    <Badge className="mx-auto h-5 px-1.5 text-[10px]">{t('common:current')}</Badge>
                  ) : (
                    <Badge variant="outline" className="mx-auto h-5 px-1.5 text-[10px]">
                      Next
                    </Badge>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
