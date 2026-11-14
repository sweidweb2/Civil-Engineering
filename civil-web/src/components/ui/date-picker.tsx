import * as React from 'react'
import { cn } from 'cn'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'

type DatePickerProps = {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

function DatePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  id,
}: DatePickerProps) {
  const { t } = useTranslation('common')
  const { dateFnsLocale } = useLocaleFormat()
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!value}
            className={cn(
              'h-10 w-full justify-start text-start font-normal data-[empty=true]:text-muted-foreground',
              className,
            )}
          />
        }
      >
        <CalendarIcon />
        {value ? (
          format(value, 'PPP', { locale: dateFnsLocale })
        ) : (
          <span>{placeholder ?? t('pickDate')}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={dateFnsLocale}
          selected={value}
          onSelect={(date) => {
            onChange?.(date)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
export type { DatePickerProps }
