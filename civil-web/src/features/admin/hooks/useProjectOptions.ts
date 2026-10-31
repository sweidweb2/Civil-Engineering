import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  type ProjectStatus,
  type ProjectType,
} from '@/services/projects'

/** Translated project status/type options (API enum values stay untouched). */
export function useProjectOptions() {
  const { t } = useTranslation('projects')

  return useMemo(() => {
    const statusOptions: Array<{ value: ProjectStatus; label: string }> =
      PROJECT_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: t(`status.${option.value}`),
      }))
    const typeOptions: Array<{ value: ProjectType; label: string }> = PROJECT_TYPE_OPTIONS.map(
      (option) => ({ value: option.value, label: t(`type.${option.value}`) }),
    )

    return {
      statusOptions,
      typeOptions,
      statusLabel: (status: string) =>
        statusOptions.find((option) => option.value === status)?.label ??
        status.replaceAll('_', ' '),
      typeLabel: (type: string | null | undefined) =>
        typeOptions.find((option) => option.value === type)?.label ?? '—',
    }
  }, [t])
}
