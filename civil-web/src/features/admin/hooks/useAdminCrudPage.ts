import { useState } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/services/api'

type UseAdminCrudPageOptions<TRow, TForm> = {
  emptyForm: TForm
  formFromRow: (row: TRow) => TForm
}

/**
 * Shared dialog / delete / busy state for admin table CRUD pages
 * (ManageSteps, ManageInputTypes, …).
 */
export function useAdminCrudPage<TRow extends { id: string }, TForm>({
  emptyForm,
  formFromRow,
}: UseAdminCrudPageOptions<TRow, TForm>) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TRow | null>(null)
  const [form, setForm] = useState<TForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<TRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(row: TRow) {
    setEditing(row)
    setForm(formFromRow(row))
    setDialogOpen(true)
  }

  async function withSaving(action: () => Promise<void>, fallbackError: string) {
    setIsSaving(true)
    try {
      await action()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : fallbackError)
    } finally {
      setIsSaving(false)
    }
  }

  async function withBusy(id: string, action: () => Promise<void>, fallbackError: string) {
    setBusyId(id)
    try {
      await action()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : fallbackError)
    } finally {
      setBusyId(null)
    }
  }

  return {
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    setForm,
    isSaving,
    pendingDelete,
    setPendingDelete,
    busyId,
    openCreate,
    openEdit,
    withSaving,
    withBusy,
  }
}
