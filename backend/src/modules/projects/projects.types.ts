export type ProjectStatus =
  'DRAFT' | 'PLANNING' | 'APPROVED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

export type ProjectType =
  'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'INFRASTRUCTURE' | 'RENOVATION' | 'OTHER'

export type Project = {
  id: string
  name: string
  description: string | null
  code: string | null
  ownerId: string
  address: string | null
  city: string | null
  country: string | null
  startDate: string | null
  endDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  status: ProjectStatus
  progress: number
  budget: string | null
  currency: string
  actualCost: string | null
  type: ProjectType | null
  isPublic: boolean
  tags: unknown | null
  attachments: unknown | null
  notes: string | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  /** Present on list responses when a main gallery image exists and storage can presign. */
  mainImageUrl?: string | null
}

/** Repository list row before service attaches a presigned URL. */
export type ProjectListRow = Project & {
  mainImageStoragePath: string | null
}
