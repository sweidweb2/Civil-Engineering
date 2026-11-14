import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type StageFieldLabelProps = {
  htmlFor?: string
  children: string
  required?: boolean
  optional?: boolean
  className?: string
}

export function StageFieldLabel({
  htmlFor,
  children,
  required,
  optional,
  className,
}: StageFieldLabelProps) {
  const { t } = useTranslation('projects')
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={htmlFor} className="gap-1">
        <span>{children}</span>
        {required ? <span className="text-destructive">*</span> : null}
        {optional ? (
          <span className="font-normal text-muted-foreground"> ({t('stages.optional')})</span>
        ) : null}
      </Label>
    </div>
  )
}
