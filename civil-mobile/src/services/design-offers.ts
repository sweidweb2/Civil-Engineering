import { appendUploadPart } from '../lib/appendUploadPart'
import { apiRequest } from './api'

export type DesignOffer = {
  id: string
  title: string
  description: string
  priceStart: string
  priceEnd: string
  currency: string
  imagePath: string | null
  imageUrl: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type PaginatedDesignOffers = {
  data: DesignOffer[]
  meta: { page: number; limit: number; total: number }
}

export type ListDesignOffersQuery = {
  page?: number
  limit?: number
  q?: string
  activeOnly?: boolean
}

export type DesignOfferWriteInput = {
  title: string
  description: string
  priceStart: string
  priceEnd: string
  currency?: string
  isActive?: boolean
  sortOrder?: number
}

export function formatOfferPrice(offer: Pick<DesignOffer, 'currency' | 'priceStart' | 'priceEnd'>) {
  const cur = offer.currency?.trim() ?? ''
  const start = Number(offer.priceStart)
  const end = Number(offer.priceEnd)
  const fmt = (n: number) =>
    Number.isFinite(n)
      ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : offer.priceStart
  if (Number.isFinite(start) && Number.isFinite(end) && start === end) {
    return `${cur} ${fmt(start)}`.trim()
  }
  return `${cur} ${fmt(start)}–${fmt(end)}`.trim()
}

export function listDesignOffers(query: ListDesignOffersQuery = {}) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.q) params.set('q', query.q)
  if (query.activeOnly != null) params.set('activeOnly', String(query.activeOnly))
  const qs = params.toString()
  return apiRequest<PaginatedDesignOffers>(`/design-offers${qs ? `?${qs}` : ''}`)
}

export function getDesignOffer(id: string) {
  return apiRequest<{ data: DesignOffer }>(`/design-offers/${id}`).then((res) => res.data)
}

export function createDesignOffer(input: DesignOfferWriteInput) {
  return apiRequest<{ data: DesignOffer }>('/design-offers', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((res) => res.data)
}

export function updateDesignOffer(id: string, input: Partial<DesignOfferWriteInput>) {
  return apiRequest<{ data: DesignOffer }>(`/design-offers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then((res) => res.data)
}

export async function uploadDesignOfferImage(
  id: string,
  file: { uri: string; mime: string; name: string },
) {
  const body = new FormData()
  await appendUploadPart(body, 'file', {
    uri: file.uri,
    mime: file.mime,
    originalName: file.name,
  })
  return apiRequest<{ data: DesignOffer }>(`/design-offers/${id}/image`, {
    method: 'POST',
    body,
  }).then((res) => res.data)
}

export function deleteDesignOffer(id: string) {
  return apiRequest<void>(`/design-offers/${id}`, { method: 'DELETE' })
}
