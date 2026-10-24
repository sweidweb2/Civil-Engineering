import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const providerStatusSchema = z.enum(['PENDING', 'APPROVED', 'SUSPENDED'])

export const providerIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const listProvidersQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  status: providerStatusSchema.optional(),
})

function blankToUndefined(value: unknown) {
  if (value == null || value === '') return undefined
  return typeof value === 'string' ? value.trim() : value
}

function blankToNull(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return typeof value === 'string' ? value.trim() : value
}

function optionalText(max: number) {
  return z.preprocess(blankToUndefined, z.string().max(max).optional())
}

function patchText(max: number) {
  return z.preprocess(blankToNull, z.string().max(max).nullable().optional())
}

const optionalEmail = z.preprocess(blankToUndefined, z.string().email().max(254).optional())
const patchEmail = z.preprocess(blankToNull, z.string().email().max(254).nullable().optional())
const optionalUrl = z.preprocess(blankToUndefined, z.string().url().max(500).optional())
const patchUrl = z.preprocess(blankToNull, z.string().url().max(500).nullable().optional())
/** Public URL or R2 object key for the provider brand logo. */
const optionalLogoRef = z.preprocess(blankToUndefined, z.string().max(500).optional())
const patchLogoRef = z.preprocess(blankToNull, z.string().max(500).nullable().optional())

function toCoord(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : value
  }
  return value
}

function optionalCoord(min: number, max: number) {
  return z.preprocess((value) => {
    const next = blankToUndefined(value)
    return next === undefined ? undefined : toCoord(next)
  }, z.number().min(min).max(max).optional())
}

function patchCoord(min: number, max: number) {
  return z.preprocess((value) => {
    const next = blankToNull(value)
    return next === undefined || next === null ? next : toCoord(next)
  }, z.number().min(min).max(max).nullable().optional())
}

export const createProviderBodySchema = z.object({
  ownerUserId: z.string().trim().min(1, 'Owner is required'),
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name must be at most 120 characters'),
  description: optionalText(2000),
  logoUrl: optionalLogoRef,
  phone: optionalText(20),
  whatsapp: optionalText(20),
  email: optionalEmail,
  website: optionalUrl,
  address: optionalText(200),
  city: optionalText(80),
  country: optionalText(80),
  lat: optionalCoord(-90, 90),
  lng: optionalCoord(-180, 180),
  status: providerStatusSchema.optional(),
})

export const updateProviderBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(120, 'Name must be at most 120 characters')
      .optional(),
    description: patchText(2000),
    logoUrl: patchLogoRef,
    phone: patchText(20),
    whatsapp: patchText(20),
    email: patchEmail,
    website: patchUrl,
    address: patchText(200),
    city: patchText(80),
    country: patchText(80),
    lat: patchCoord(-90, 90),
    lng: patchCoord(-180, 180),
    status: providerStatusSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  })

export type ListProvidersQuery = {
  page: number
  limit: number
  q?: string
  status?: z.infer<typeof providerStatusSchema>
}

export type CreateProviderBody = {
  ownerUserId: string
  name: string
  description?: string
  logoUrl?: string
  phone?: string
  whatsapp?: string
  email?: string
  website?: string
  address?: string
  city?: string
  country?: string
  lat?: number
  lng?: number
  status?: z.infer<typeof providerStatusSchema>
}

export type UpdateProviderBody = {
  name?: string
  description?: string | null
  logoUrl?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  lat?: number | null
  lng?: number | null
  status?: z.infer<typeof providerStatusSchema>
}
