import { Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

import { StepperInputControl, type StepperInputRendererProps } from './StepperInputRenderers'

type StepperInputCardProps = StepperInputRendererProps & {
  isRemoving: boolean
  onRemove: () => void
}

/** Bordered card with label/badges/remove header around the type-specific control. */
export function StepperInputCard({
  isRemoving,
  onRemove,
  ...rendererProps
}: StepperInputCardProps) {
  const { input } = rendererProps
  const isFile = input.inputTypeCode.toUpperCase() === 'FILE'

  return (
    <div className="flex h-full min-h-[5.75rem] flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <Label
          htmlFor={isFile ? `stepper-file-${input.id}` : `stepper-${input.id}`}
          className="min-w-0 truncate"
          title={input.label}
        >
          {input.label}
        </Label>
        <div className="flex shrink-0 items-center gap-1">
          {input.isProjectOnly ? (
            <Badge variant="outline" className="text-[10px]">
              Project
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              Template
            </Badge>
          )}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${input.label}`}
            disabled={isRemoving}
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-auto min-w-0">
        <StepperInputControl {...rendererProps} />
      </div>
    </div>
  )
}
