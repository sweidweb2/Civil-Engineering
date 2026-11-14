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
  url: string | null
}

export type CreateProjectImageAtomicInput = CreateProjectImageData & {
  maxImages: number
  /** When true and gallery is empty, force isMain even if data.isMain is false. */
  autoMainIfEmpty: boolean
}

export type ProjectImagesRepository = {
  findByProjectId: (projectId: string) => Promise<ProjectImage[]>
  findById: (id: string) => Promise<ProjectImage | null>
  countByProjectId: (projectId: string) => Promise<number>
  create: (data: CreateProjectImageData) => Promise<ProjectImage>
  /** Lock project row, enforce max count, unset other mains, create — one transaction. */
  createAtomic: (data: CreateProjectImageAtomicInput) => Promise<ProjectImage>
  update: (id: string, data: UpdateProjectImageData) => Promise<ProjectImage>
  /** Unset other mains and set this image as main (optional displayOrder) in one transaction. */
  setMainAtomic: (
    projectId: string,
    imageId: string,
    opts?: { displayOrder?: number },
  ) => Promise<ProjectImage>
  reorderAtomic: (projectId: string, orderedIds: string[]) => Promise<void>
  delete: (id: string) => Promise<void>
  unsetMainImage: (projectId: string) => Promise<void>
  findMainImageByProjectId: (projectId: string) => Promise<ProjectImage | null>
}
