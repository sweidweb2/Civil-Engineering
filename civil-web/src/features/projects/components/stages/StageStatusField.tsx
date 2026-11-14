import { useTranslation } from 'react-i18next'

import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PROJECT_STAGE_STATUS_OPTIONS, type ProjectStageStatus } from '@/services/project-stages'

type StageStatusFieldProps = {
  value: ProjectStageStatus
  onChange: (value: ProjectStageStatus) => void
  disabled?: boolean
}

export function StageStatusField({ value, onChange, disabled }: StageStatusFieldProps) {
  const { t } = useTranslation('projects')

  return (
    <Field>
      <Label>{t('stages.status')}</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as ProjectStageStatus)
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('stages.placeholders.status')} />
        </SelectTrigger>
        <SelectContent>
          {PROJECT_STAGE_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(`stages.statusValues.${option.value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
