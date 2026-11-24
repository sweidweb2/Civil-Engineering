export const DESIGN_CATEGORIES = [
  'ARCHITECTURAL',
  'STRUCTURAL',
  'MEP',
  'CIVIL',
  'LANDSCAPE',
  'INTERIOR',
  'OTHER',
] as const

export type DesignCategory = (typeof DESIGN_CATEGORIES)[number]

export type DesignRequestStatusName =
  'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'

export type DesignRequestRecord = {
  id: string
  subject: string
  description: string
  category: string
  status: DesignRequestStatusName
  neededBy: Date
  requirementFilePath: string | null
  responseFilePath: string | null
  projectId: string | null
  projectName: string | null
  designOfferId: string | null
  designOfferTitle: string | null
  designOfferImagePath: string | null
  requestedById: string
  requestedByEmail: string
  requestedByName: string
  createdAt: Date
  updatedAt: Date
}

export type DesignRequestResponse = Omit<
  DesignRequestRecord,
  'neededBy' | 'createdAt' | 'updatedAt' | 'designOfferImagePath'
> & {
  neededBy: string
  createdAt: string
  updatedAt: string
  requirementFileUrl: string | null
  responseFileUrl: string | null
  designOfferImageUrl: string | null
}

export type DesignerContact = {
  email: string
  phone: string | null
  displayName: string | null
}

export type CreateDesignRequestData = {
  subject: string
  description: string
  category: DesignCategory
  neededBy: Date
  projectId: string | null
  designOfferId: string | null
  requestedById: string
  requirementFilePath?: string | null
}

export type ListDesignRequestsFilter = {
  page: number
  limit: number
  status?: DesignRequestStatusName
  projectId?: string
  requestedById?: string
}
