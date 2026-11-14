import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Loader2, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import { getDownloadUrl } from '@/services/files'
import { type Listing, listListings } from '@/services/listings'
import {
  fileIdFromStepperValue,
  isFileSnapshot,
  listingIdFromStepperValue,
  type ProjectStepInputField,
  type StepperValue,
} from '@/services/project-steppers'

import {
  fileDisplayName,
  fileMime,
  formatDateValue,
  isImageMime,
  STEPPER_FILE_ACCEPT,
  toDate,
} from '../lib/stepper-values'

export type StepperInputRendererProps = {
  input: ProjectStepInputField
  value: StepperValue
  isBusy: boolean
  onChange: (value: StepperValue) => void
  onFileSelected: (file: File | undefined) => void
  onClearFile: () => void
  onOpenFile: (fileId: string) => void
}

/** Small cover thumb for FILE inputs (images only). */
function StepperFileThumb({
  fileId,
  mime,
  name,
  isBusy,
}: {
  fileId: string
  mime: string | null
  name: string | null
  isBusy?: boolean
}) {
  const { t } = useTranslation('projects')
  const [url, setUrl] = useState<string | null>(null)
  const showImage = isImageMime(mime)

  useEffect(() => {
    if (!showImage || !fileId) {
      setUrl(null)
      return
    }
    let cancelled = false
    void getDownloadUrl(fileId)
      .then((result) => {
        if (!cancelled) setUrl(result.downloadUrl)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [fileId, showImage])

  if (!showImage) return null

  return (
    <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted shadow-sm">
      {url ? (
        <img
          src={url}
          alt={name ?? t('uploadedImageAlt')}
          className="size-full object-cover object-center"
        />
      ) : (
        <div className="flex size-full items-center justify-center" aria-hidden>
          {isBusy ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="size-full animate-pulse bg-muted" />
          )}
        </div>
      )}
    </div>
  )
}

function CategoryListingSelect({
  id,
  categoryId,
  value,
  snapshotLabel,
  onChange,
}: {
  id: string
  categoryId: string | null
  value: string | null
  snapshotLabel: string | null
  onChange: (listingId: string | null) => void
}) {
  const { t } = useTranslation(['projects', 'common'])
  const loadListings = useCallback(async () => {
    if (!categoryId) {
      return {
        data: [] as Listing[],
        meta: {
          page: 1,
          limit: 100,
          total: 0,
          typeCounts: { MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0 },
        },
      }
    }
    return listListings(1, 100, { categoryId, status: 'ACTIVE', counts: false })
  }, [categoryId])

  const remote = useRemoteData(loadListings, {
    queryKey: ['listings', 'stepper-category', categoryId ?? 'none'],
    enabled: Boolean(categoryId),
  })
  const listings = remote.status === 'success' ? remote.data.data : []
  const options =
    value && !listings.some((listing) => listing.id === value) && snapshotLabel
      ? [{ id: value, name: t('projects:savedListing', { name: snapshotLabel }) }, ...listings]
      : listings

  if (!categoryId) {
    return <p className="text-sm text-muted-foreground">{t('projects:noCategoryBinding')}</p>
  }

  return (
    <Select
      items={[
        { value: 'unset', label: t('projects:unset') },
        ...options.map((listing) => ({ value: listing.id, label: listing.name })),
      ]}
      value={value ?? 'unset'}
      onValueChange={(next) => onChange(!next || next === 'unset' ? null : next)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue
          placeholder={remote.isLoading ? t('common:loading') : t('projects:selectListing')}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unset">{t('projects:unset')}</SelectItem>
        {options.map((listing) => (
          <SelectItem key={listing.id} value={listing.id}>
            {listing.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function YesNoInput({ input, value, onChange }: StepperInputRendererProps) {
  const { t } = useTranslation(['projects', 'common'])
  const yesNoValue = value === true ? 'yes' : value === false ? 'no' : 'unset'
  return (
    <Select
      value={yesNoValue}
      onValueChange={(next) => onChange(next === 'yes' ? true : next === 'no' ? false : null)}
    >
      <SelectTrigger id={`stepper-${input.id}`} className="w-full">
        <SelectValue placeholder={t('projects:unset')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unset">{t('projects:unset')}</SelectItem>
        <SelectItem value="yes">{t('common:yes')}</SelectItem>
        <SelectItem value="no">{t('common:no')}</SelectItem>
      </SelectContent>
    </Select>
  )
}

function DateInput({ input, value, onChange }: StepperInputRendererProps) {
  return (
    <DatePicker
      id={`stepper-${input.id}`}
      className="w-full"
      placeholder={input.label}
      value={toDate(value)}
      onChange={(date) => onChange(formatDateValue(date))}
    />
  )
}

function NumberInput({ input, value, onChange }: StepperInputRendererProps) {
  return (
    <Input
      id={`stepper-${input.id}`}
      type="number"
      className="w-full"
      placeholder={input.label}
      value={typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''}
      onChange={(event) => {
        const raw = event.target.value
        const parsed = Number.parseFloat(raw)
        onChange(raw.trim() === '' || !Number.isFinite(parsed) ? null : parsed)
      }}
    />
  )
}

function CategoryInput({ input, value, onChange }: StepperInputRendererProps) {
  const selectedListingId = listingIdFromStepperValue(value)
  const snapshotName =
    typeof input.value === 'object' &&
    input.value !== null &&
    'name' in input.value &&
    input.value.id === selectedListingId
      ? input.value.name
      : null
  return (
    <CategoryListingSelect
      id={`stepper-${input.id}`}
      categoryId={input.categoryId}
      value={selectedListingId}
      snapshotLabel={snapshotName}
      onChange={onChange}
    />
  )
}

function FileInput({
  input,
  value,
  isBusy,
  onFileSelected,
  onClearFile,
  onOpenFile,
}: StepperInputRendererProps) {
  const { t } = useTranslation(['projects', 'common'])
  const selectedFileId = fileIdFromStepperValue(value)
  const name =
    fileDisplayName(value) ??
    (isFileSnapshot(input.value) && input.value.id === selectedFileId
      ? input.value.originalName
      : null)
  const mime =
    fileMime(value) ??
    (isFileSnapshot(input.value) && input.value.id === selectedFileId ? input.value.mime : null)
  const inputId = `stepper-file-${input.id}`

  return (
    <>
      <input
        id={inputId}
        type="file"
        accept={STEPPER_FILE_ACCEPT}
        className="sr-only"
        disabled={isBusy}
        onChange={(event) => {
          const next = event.target.files?.[0]
          event.target.value = ''
          onFileSelected(next)
        }}
      />
      <div className="flex min-h-9 items-center gap-2">
        {selectedFileId ? (
          <StepperFileThumb fileId={selectedFileId} mime={mime} name={name} isBusy={isBusy} />
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm',
              selectedFileId ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {selectedFileId ? (name ?? selectedFileId) : t('projects:noFileSelected')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => document.getElementById(inputId)?.click()}
          >
            {isBusy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {selectedFileId ? t('projects:replaceFile') : t('common:upload')}
          </Button>
          {selectedFileId ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isBusy}
                aria-label={t('projects:openFile')}
                onClick={() => onOpenFile(selectedFileId)}
              >
                <ExternalLink className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isBusy}
                aria-label={t('projects:clearFile')}
                onClick={onClearFile}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}

function TextInput({ input, value, onChange }: StepperInputRendererProps) {
  return (
    <Input
      id={`stepper-${input.id}`}
      className="w-full"
      placeholder={input.label}
      maxLength={2000}
      value={typeof value === 'string' ? value : value == null ? '' : String(value)}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

/** Picks the control for an input-type code. Unknown codes fall back to text. */
export function StepperInputControl(props: StepperInputRendererProps) {
  switch (props.input.inputTypeCode.toUpperCase()) {
    case 'YES_NO':
      return <YesNoInput {...props} />
    case 'DATE':
      return <DateInput {...props} />
    case 'NUMBER':
      return <NumberInput {...props} />
    case 'CATEGORY':
      return <CategoryInput {...props} />
    case 'FILE':
      return <FileInput {...props} />
    default:
      return <TextInput {...props} />
  }
}
