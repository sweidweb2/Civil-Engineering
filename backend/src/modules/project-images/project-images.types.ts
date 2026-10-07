export type ProjectImage = {
  id: string
  projectId: string
  storagePath: string
  isMain: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export type CreateProjectImageData = {
  projectId: string
  storagePath: string
  isMain?: boolean
  displayOrder?: number
}

export type UpdateProjectImageData = {
  isMain?: boolean
  displayOrder?: number
}

export type ProjectImageWithUrl = ProjectImage & {
  url: string
}

export type ProjectImagesRepository = {
  findByProjectId: (projectId: string) => Promise<ProjectImage[]>
  findById: (id: string) => Promise<ProjectImage | null>
  countByProjectId: (projectId: string) => Promise<number>
  create: (data: CreateProjectImageData) => Promise<ProjectImage>
  update: (id: string, data: UpdateProjectImageData) => Promise<ProjectImage>
  delete: (id: string) => Promise<void>
  unsetMainImage: (projectId: string) => Promise<void>
  findMainImageByProjectId: (projectId: string) => Promise<ProjectImage | null>
}
