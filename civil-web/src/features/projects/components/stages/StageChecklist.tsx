import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChecklistItem } from '@/features/projects/lib/stage-completeness'
import { cn } from '@/lib/utils'

type StageChecklistProps = {
  items: ChecklistItem[]
}

export function StageChecklist({ items }: StageChecklistProps) {
  const { t } = useTranslation('projects')
  const done = items.filter((item) => item.done).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{t('stages.checklistTitle')}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {t('stages.checklistProgress', { done, total: items.length })}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border',
                  item.done
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-amber-500 bg-transparent',
                )}
              >
                {item.done ? <Check className="size-3" aria-hidden /> : null}
              </span>
              <span
                className={cn(item.done ? 'text-muted-foreground line-through' : 'text-foreground')}
              >
                {t(item.labelKey)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
