import { create } from 'zustand'

export type AppAlertRequest = {
  id: number
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
}

type AlertState = {
  current: AppAlertRequest | null
  show: (input: Omit<AppAlertRequest, 'id' | 'confirmLabel'> & { confirmLabel?: string }) => void
  dismiss: () => void
}

let nextId = 1

/**
 * Imperative in-app alerts — replaces RN Alert / window.confirm on web.
 */
export const useAlertStore = create<AlertState>((set) => ({
  current: null,
  show: (input) =>
    set({
      current: {
        id: nextId++,
        title: input.title,
        message: input.message,
        confirmLabel: input.confirmLabel ?? 'OK',
        cancelLabel: input.cancelLabel,
        onConfirm: input.onConfirm,
        onCancel: input.onCancel,
      },
    }),
  dismiss: () => set({ current: null }),
}))
