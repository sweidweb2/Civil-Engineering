export type DesignOfferRecord = {
  id: string
  title: string
  description: string
  priceStart: string
  priceEnd: string
  currency: string
  imagePath: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type DesignOfferResponse = Omit<DesignOfferRecord, 'createdAt' | 'updatedAt'> & {
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export type CreateDesignOfferData = {
  title: string
  description: string
  priceStart: string
  priceEnd: string
  currency: string
  isActive: boolean
  sortOrder: number
}

export type UpdateDesignOfferData = {
  title?: string
  description?: string
  priceStart?: string
  priceEnd?: string
  currency?: string
  isActive?: boolean
  sortOrder?: number
}

export type ListDesignOffersFilter = {
  page: number
  limit: number
  q?: string
  activeOnly?: boolean
}
