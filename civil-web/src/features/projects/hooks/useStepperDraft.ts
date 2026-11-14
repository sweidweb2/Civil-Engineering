import { useCallback, useEffect, useRef, useState } from 'react'

import type { ProjectStepDetail, StepperValue } from '@/services/project-steppers'

import { draftValueForInput } from '../lib/stepper-values'

export type StepperDraft = Record<string, StepperValue>

function draftFromDetail(detail: ProjectStepDetail): StepperDraft {
  const next: StepperDraft = {}
  for (const input of detail.inputs) {
    next[input.id] = draftValueForInput(input)
  }
  return next
}

/**
 * Unsaved input values for the selected stepper.
 * Re-hydrates only when the step changes — file auto-save must not wipe other edits.
 */
export function useStepperDraft(detail: ProjectStepDetail | null) {
  const [draft, setDraft] = useState<StepperDraft>({})
  const hydratedStepIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!detail) {
      hydratedStepIdRef.current = null
      setDraft({})
      return
    }
    if (hydratedStepIdRef.current === detail.id) return
    hydratedStepIdRef.current = detail.id
    setDraft(draftFromDetail(detail))
  }, [detail])

  const setValue = useCallback((inputId: string, value: StepperValue) => {
    setDraft((current) => ({ ...current, [inputId]: value }))
  }, [])

  const removeValue = useCallback((inputId: string) => {
    setDraft((current) => {
      const next = { ...current }
      delete next[inputId]
      return next
    })
  }, [])

  /** Replace the whole draft with server values (after a full save). */
  const syncFromDetail = useCallback((next: ProjectStepDetail) => {
    setDraft(draftFromDetail(next))
  }, [])

  return { draft, setValue, removeValue, syncFromDetail }
}
