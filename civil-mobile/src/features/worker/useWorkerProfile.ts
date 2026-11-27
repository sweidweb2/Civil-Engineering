import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cvCompletenessPercent } from '@/features/worker/cvCompleteness'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys, invalidateWorkerCaches } from '@/lib/cacheKeys'
import { useToastSuccess } from '@/services/toast'
import {
  EMPTY_WORKER_WRITE,
  getMyWorkerProfile,
  profileToWrite,
  upsertMyWorkerProfile,
  type WorkerProfile,
  type WorkerProfileWriteInput,
  type WorkerVerificationStatus,
} from '@/services/workers'

export type WorkerSaveContext = {
  profile: WorkerProfile | null
  base: WorkerProfileWriteInput
}

export type WorkerSaveOptions = {
  /** Toast shown on success. Defaults to "CV saved"; `null` shows none. */
  successMessage?: string | null
}

export type WorkerSavePatch =
  Partial<WorkerProfileWriteInput> | ((ctx: WorkerSaveContext) => WorkerProfileWriteInput)

/** Serialize full-replace PUTs across screens so concurrent section saves cannot clobber each other. */
let workerSaveChain: Promise<unknown> = Promise.resolve()

function enqueueWorkerSave<T>(task: () => Promise<T>): Promise<T> {
  const run = workerSaveChain.then(task, task)
  workerSaveChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/** Load `/workers/me` and save via full-replace PUT (merge onto a freshly loaded profile). */
export function useWorkerProfile() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(() => getMyWorkerProfile(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.workersMe, persist: true })
  const profile: WorkerProfile | null = remote.status === 'success' ? remote.data.data : null
  const verificationStatus: WorkerVerificationStatus =
    remote.status === 'success' ? remote.data.meta.verificationStatus : 'UNVERIFIED'
  /** True once `/workers/me` resolved (including `data: null` for a new CV). */
  const isReady = remote.status === 'success'
  const error = remote.status === 'error' ? remote.error : undefined

  async function saveMerged(
    patch: WorkerSavePatch,
    options: WorkerSaveOptions = {},
  ): Promise<boolean> {
    if (!isReady) {
      handleApiError(new Error('Worker profile is still loading'), t('worker.saveFailed'))
      return false
    }

    setIsSaving(true)
    try {
      const { before, after } = await enqueueWorkerSave(async () => {
        const latest = await getMyWorkerProfile()
        const base = latest.data ? profileToWrite(latest.data) : { ...EMPTY_WORKER_WRITE }
        const body: WorkerProfileWriteInput =
          typeof patch === 'function'
            ? patch({ profile: latest.data, base })
            : { ...base, ...patch }
        await upsertMyWorkerProfile(body)
        return { before: cvCompletenessPercent(latest.data), after: cvCompletenessPercent(body) }
      })
      invalidateWorkerCaches()
      if (after === 100 && before < 100) toastSuccess(t('worker.cvComplete'))
      else if (options.successMessage !== null) {
        toastSuccess(options.successMessage ?? t('worker.saved'))
      }
      // Background refresh: keep the CV on screen (no skeleton flash).
      await remote.refetch()
      return true
    } catch (error) {
      handleApiError(error, t('worker.saveFailed'))
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return {
    remote,
    profile,
    verificationStatus,
    isReady,
    isSaving,
    saveMerged,
    isLoading: !isReady && !error,
    isFetching: remote.isFetching,
    error,
    refetch: remote.refetch,
  }
}
