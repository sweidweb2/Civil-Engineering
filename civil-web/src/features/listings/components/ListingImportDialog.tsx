import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/services/api'
import { type Category, listCategories } from '@/services/categories'
import { importListings, type ListingImportRow } from '@/services/listings'

import { parseListingCsv } from '../listings-csv'
import { ListingCsvRulesPanel } from './ListingCsvRulesPanel'

type ListingImportDialogProps = {
  open: boolean
  providerId: string
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

function isListingCategory(category: Category) {
  return (
    category.kind === 'MATERIAL' || category.kind === 'EQUIPMENT' || category.kind === 'SERVICE'
  )
}

export function ListingImportDialog({
  open,
  providerId,
  onOpenChange,
  onImported,
}: ListingImportDialogProps) {
  const { t } = useTranslation(['admin', 'common'])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ListingImportRow[]>([])
  const [ignoredColumns, setIgnoredColumns] = useState<string[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setFileName(null)
    setRows([])
    setIgnoredColumns([])
    setParseError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    let cancelled = false
    void listCategories(1, 100, { includeCounts: false })
      .then((result) => {
        if (!cancelled) setCategories(result.data.filter(isListingCategory))
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  async function onFileChange(file: File | null) {
    if (!file) {
      setFileName(null)
      setRows([])
      setIgnoredColumns([])
      setParseError(null)
      return
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError(t('admin:listings.import.mustBeCsv'))
      setFileName(null)
      setRows([])
      return
    }
    const text = await file.text()
    const parsed = parseListingCsv(text)
    setFileName(file.name)
    setIgnoredColumns(parsed.ignoredColumns)
    if (parsed.error) {
      setParseError(t(`admin:listings.import.${parsed.error}`))
      setRows([])
      return
    }
    setParseError(null)
    setRows(parsed.rows)
  }

  async function handleSubmit() {
    if (rows.length === 0) {
      toast.error(t('admin:listings.import.noDataRows'))
      return
    }
    setIsSaving(true)
    try {
      const result = await importListings({ providerId, rows })
      toast.message(
        t('admin:listings.import.successToast', {
          created: result.data.created,
          skipped: result.data.skipped,
        }),
      )
      if (result.data.errors.length > 0) {
        const preview = result.data.errors
          .slice(0, 5)
          .map((error) => t('admin:listings.import.errorLine', error))
          .join('\n')
        toast.message(t('admin:listings.import.skippedDetails'), { description: preview })
      }
      onOpenChange(false)
      onImported()
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t('admin:listings.import.couldNotImport'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSaving) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('admin:listings.import.title')}</DialogTitle>
          <DialogDescription>{t('admin:listings.import.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <ListingCsvRulesPanel categories={categories} />

          <div className="grid gap-2">
            <Label htmlFor="listing-import-file">{t('admin:listings.import.file')}</Label>
            <Input
              ref={fileInputRef}
              id="listing-import-file"
              type="file"
              accept=".csv,text/csv"
              disabled={isSaving}
              onChange={(event) => void onFileChange(event.target.files?.[0] ?? null)}
            />
          </div>

          {fileName ? (
            <p className="text-sm text-muted-foreground">
              {t('admin:listings.import.ready', { file: fileName, count: rows.length })}
            </p>
          ) : null}

          {ignoredColumns.length > 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t('admin:listings.import.ignoredColumns', {
                columns: ignoredColumns.join(', '),
              })}
            </p>
          ) : null}

          {parseError ? <p className="text-sm text-destructive">{parseError}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            {t('common:cancel')}
          </Button>
          <Button
            type="button"
            disabled={isSaving || rows.length === 0 || Boolean(parseError)}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {isSaving ? t('common:saving') : t('admin:listings.import.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
