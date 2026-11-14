import {
  createGalleryImagesApi,
  type GalleryImageBase,
  type ReorderGalleryImagesInput,
  type UpdateGalleryImageInput,
  type UploadGalleryImageInput,
} from './galleryImages'

export type ProjectImage = GalleryImageBase & { projectId: string }

export type UploadProjectImageInput = UploadGalleryImageInput
export type UpdateProjectImageInput = UpdateGalleryImageInput
export type ReorderProjectImagesInput = ReorderGalleryImagesInput

export const projectImagesApi = createGalleryImagesApi<ProjectImage>({
  basePath: '/project-images',
  ownerSegment: 'projects',
})

export const listProjectImages = projectImagesApi.list
export const getProjectImage = projectImagesApi.get
export const uploadProjectImage = projectImagesApi.upload
export const updateProjectImage = projectImagesApi.update
export const deleteProjectImage = projectImagesApi.remove
export const reorderProjectImages = projectImagesApi.reorder

export function getMainImageUrl(projectId: string): Promise<string | null> {
  return listProjectImages(projectId)
    .then((res) => {
      const mainImage = res.data.find((img) => img.isMain)
      return mainImage?.url ?? null
    })
    .catch(() => null)
}
