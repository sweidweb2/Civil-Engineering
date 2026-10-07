import { apiRequest } from './api'

export type ProjectImage = {
  id: string
  projectId: string
  storagePath: string
  url: string
  isMain: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type UploadProjectImageInput = {
  file: File
  isMain?: boolean
  displayOrder?: number
}

export type UpdateProjectImageInput = {
  isMain?: boolean
  displayOrder?: number
}

export type ReorderProjectImagesInput = {
  imageIds: string[]
}

export function listProjectImages(projectId: string) {
  return apiRequest<{ data: ProjectImage[] }>(`/project-images/projects/${projectId}/images`)
}

export function getProjectImage(imageId: string) {
  return apiRequest<{ data: ProjectImage }>(`/project-images/images/${imageId}`)
}

export async function uploadProjectImage(
  projectId: string,
  input: UploadProjectImageInput,
): Promise<{ data: ProjectImage }> {
  const formData = new FormData()
  formData.append('image', input.file)
  if (input.isMain !== undefined) {
    formData.append('isMain', String(input.isMain))
  }
  if (input.displayOrder !== undefined) {
    formData.append('displayOrder', String(input.displayOrder))
  }

  return apiRequest<{ data: ProjectImage }>(`/project-images/projects/${projectId}/images`, {
    method: 'POST',
    body: formData,
  })
}

export function updateProjectImage(imageId: string, input: UpdateProjectImageInput) {
  return apiRequest<{ data: ProjectImage }>(`/project-images/images/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteProjectImage(imageId: string) {
  return apiRequest<void>(`/project-images/images/${imageId}`, {
    method: 'DELETE',
  })
}

export function reorderProjectImages(projectId: string, input: ReorderProjectImagesInput) {
  return apiRequest<{ data: ProjectImage[] }>(
    `/project-images/projects/${projectId}/images/reorder`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export function getMainImageUrl(projectId: string): Promise<string | null> {
  return listProjectImages(projectId)
    .then((res) => {
      const mainImage = res.data.find((img) => img.isMain)
      return mainImage?.url ?? null
    })
    .catch(() => null)
}
