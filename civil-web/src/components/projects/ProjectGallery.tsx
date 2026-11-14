import { useState } from 'react'
import { ChevronLeft, ChevronRight, Star, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { GallerySkeleton } from '@/components/feedback/skeletons'
import { ImageGallery, type ImageGalleryLabels } from '@/components/images/ImageGallery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GALLERY_MAX_FILE_SIZE_MB,
  GALLERY_MAX_IMAGES,
  type GalleryMessages,
  useGalleryImages,
} from '@/hooks/useGalleryImages'
import { type ProjectImage, projectImagesApi } from '@/services/projectImages'

type Props = {
  projectId: string
}

export function ProjectGallery({ projectId }: Props) {
  const { t } = useTranslation(['projects', 'common'])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  const messages: GalleryMessages = {
    maxImages: t('projects:maxImages', { max: GALLERY_MAX_IMAGES }),
    invalidType: t('projects:invalidFileType'),
    fileTooLarge: t('projects:fileTooLarge', { max: GALLERY_MAX_FILE_SIZE_MB }),
    uploaded: t('projects:imageUploaded'),
    mainUpdated: t('projects:mainImageUpdated'),
    deleted: t('projects:imageDeleted'),
    couldNotUpload: t('projects:couldNotUploadImage'),
    couldNotUpdateMain: t('projects:couldNotUpdateMainImage'),
    couldNotDelete: t('projects:couldNotDeleteImage'),
  }

  const gallery = useGalleryImages<ProjectImage>({
    api: projectImagesApi,
    ownerId: projectId,
    queryKey: ['project-images', projectId],
    messages,
    onDeleted: () => setSelectedImageIndex(null),
  })
  const { images, setMain, requestDelete } = gallery

  const labels: ImageGalleryLabels = {
    title: t('projects:galleryTitle'),
    description: t('projects:galleryStats', {
      current: images.length,
      max: GALLERY_MAX_IMAGES,
      maxSize: GALLERY_MAX_FILE_SIZE_MB,
    }),
    uploadImage: t('projects:uploadImage'),
    uploading: t('common:uploading'),
    uploadProgress: {
      uploading: t('projects:uploadingImage'),
      finishing: t('projects:uploadFinishing'),
      aria: t('projects:uploadProgressAria'),
    },
    emptyTitle: t('projects:noImages'),
    emptyHint: t('projects:noImagesHint'),
    deleteTitle: t('projects:deleteImageTitle'),
    deleteDescription: () => t('projects:deleteImageDescription'),
    cancel: t('common:cancel'),
    confirmDelete: t('common:delete'),
  }

  const closeCarousel = () => setSelectedImageIndex(null)

  const nextImage = () => {
    if (selectedImageIndex === null) return
    setSelectedImageIndex((selectedImageIndex + 1) % images.length)
  }

  const prevImage = () => {
    if (selectedImageIndex === null) return
    setSelectedImageIndex((selectedImageIndex - 1 + images.length) % images.length)
  }

  return (
    <ImageGallery
      gallery={gallery}
      labels={labels}
      loadingFallback={<GallerySkeleton />}
      cardClassName="md:col-span-2"
      overlay={(loaded) =>
        selectedImageIndex !== null && loaded[selectedImageIndex] ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={closeCarousel}
          >
            <Button
              size="icon"
              variant="ghost"
              className="absolute end-4 top-4 text-white hover:bg-white/20"
              onClick={closeCarousel}
            >
              <X className="size-6" />
            </Button>

            {loaded.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute start-4 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    prevImage()
                  }}
                >
                  <ChevronLeft className="size-8 rtl:rotate-180" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute end-4 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    nextImage()
                  }}
                >
                  <ChevronRight className="size-8 rtl:rotate-180" />
                </Button>
              </>
            )}

            <div
              className="max-h-[90vh] max-w-[90vw]"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <img
                src={loaded[selectedImageIndex].url}
                alt={t('projects:imageAlt', { index: selectedImageIndex + 1 })}
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
              <div className="mt-4 flex items-center justify-center gap-2">
                {loaded[selectedImageIndex].isMain && (
                  <Badge>
                    <Star className="size-3" />
                    {t('projects:mainImageBadge')}
                  </Badge>
                )}
                <p className="text-sm text-white">
                  {t('projects:imageOf', {
                    current: selectedImageIndex + 1,
                    total: loaded.length,
                  })}
                </p>
              </div>
            </div>
          </div>
        ) : null
      }
    >
      {(rows) => (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {rows.map((image, index) => (
            <div
              key={image.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted"
              onClick={() => setSelectedImageIndex(index)}
            >
              <img
                src={image.url}
                alt={t('projects:imageAlt', { index: index + 1 })}
                className="size-full object-cover transition-transform group-hover:scale-105"
              />
              {image.isMain && (
                <Badge className="absolute start-2 top-2">
                  <Star className="size-3" />
                  {t('projects:mainImage')}
                </Badge>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                {!image.isMain && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      void setMain(image.id)
                    }}
                  >
                    <Star className="size-3" />
                    {t('projects:setMain')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="bg-white text-destructive hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    requestDelete(image)
                  }}
                >
                  <Trash2 className="size-3" />
                  {t('common:delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ImageGallery>
  )
}
