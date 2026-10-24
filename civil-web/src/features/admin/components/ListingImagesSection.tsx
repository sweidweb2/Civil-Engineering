import { useCallback, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Image as ImageIcon, Loader2, Star, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  deleteListingImage,
  type ListingImage,
  listListingImages,
  reorderListingImages,
  updateListingImage,
  uploadListingImage,
} from '@/services/listingImages'

const MAX_IMAGES = 15
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

type Props = {
  listingId: string
  canManage?: boolean
  onChanged?: () => void
}

function UploadProgress({ value }: { value: number }) {
  const label = value >= 100 ? 'Finishing upload…' : 'Uploading image…'
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {label}
        </span>
        <span>{value}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Image upload progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function ListingImagesSection({ listingId, canManage = true, onChanged }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<ListingImage | null>(null)

  const load = useCallback(() => listListingImages(listingId), [listingId])
  const remote = useRemoteData(load, { queryKey: ['listing-images', listingId] })
  const images: ListingImage[] = remote.status === 'success' ? remote.data.data : []

  async function refresh() {
    await remote.refetch()
    onChanged?.()
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images per listing`)
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPG, PNG, WEBP')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 10MB limit')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    try {
      await uploadListingImage(listingId, {
        file,
        displayOrder: images.length,
        isMain: images.length === 0,
        onProgress: setUploadProgress,
      })
      toast.success('Image uploaded')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSetMain(imageId: string) {
    setBusyId(imageId)
    try {
      await updateListingImage(imageId, { isMain: true })
      toast.success('Main image updated')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update main image')
    } finally {
      setBusyId(null)
    }
  }

  async function moveImage(imageId: string, direction: -1 | 1) {
    const index = images.findIndex((image) => image.id === imageId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= images.length) return

    const next = [...images]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)

    setBusyId(imageId)
    try {
      await reorderListingImages(listingId, { imageIds: next.map((image) => image.id) })
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder images')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!imageToDelete) return
    setBusyId(imageToDelete.id)
    try {
      await deleteListingImage(imageToDelete.id)
      toast.success('Image deleted')
      setDeleteDialogOpen(false)
      setImageToDelete(null)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete image')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton rows={4} columns={5} />}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Listing images</CardTitle>
                <CardDescription>
                  {images.length} of {MAX_IMAGES} images · JPG, PNG, WEBP · Max 10MB · Main shows on
                  the listings card
                </CardDescription>
              </div>
              {canManage && images.length < MAX_IMAGES ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(event) => void handleFileSelect(event)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    aria-busy={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {isUploading ? 'Uploading…' : 'Upload image'}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {isUploading ? <UploadProgress value={uploadProgress} /> : null}
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="size-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">No images yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload a photo to use as the listings cover image
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Preview</TableHead>
                    <TableHead className="w-24">Order</TableHead>
                    <TableHead>Main</TableHead>
                    <TableHead className="hidden sm:table-cell">Uploaded</TableHead>
                    {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {images.map((image, index) => {
                    const busy = busyId === image.id
                    return (
                      <TableRow key={image.id}>
                        <TableCell>
                          <div className="size-14 overflow-hidden rounded-md border border-border bg-muted">
                            <img
                              src={image.url}
                              alt=""
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="tabular-nums text-sm">{image.displayOrder + 1}</span>
                            {canManage ? (
                              <div className="flex flex-col">
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  disabled={busy || index === 0}
                                  aria-label="Move image up"
                                  onClick={() => void moveImage(image.id, -1)}
                                >
                                  <ArrowUp className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  disabled={busy || index === images.length - 1}
                                  aria-label="Move image down"
                                  onClick={() => void moveImage(image.id, 1)}
                                >
                                  <ArrowDown className="size-3.5" />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {image.isMain ? (
                            <Badge>
                              <Star className="size-3" />
                              Main
                            </Badge>
                          ) : canManage ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void handleSetMain(image.id)}
                            >
                              <Star className="size-3.5" />
                              Set main
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                          {new Date(image.createdAt).toLocaleString()}
                        </TableCell>
                        {canManage ? (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive"
                              disabled={busy}
                              aria-label="Delete image"
                              onClick={() => {
                                setImageToDelete(image)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </AsyncState>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the image from the listing
              {imageToDelete?.isMain
                ? '. Another image will become the main cover if one remains.'
                : '.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
