import { z } from 'zod'

import { resourceIdSchema } from '../../schemas/index.js'

export const projectStageStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'ON_HOLD',
])

export const projectIdParamsSchema = z.object({
  projectId: resourceIdSchema,
})

/** Batch stage summaries for PM home carousel (max 20 ids). */
export const batchStageSummariesBodySchema = z.object({
  projectIds: z.array(resourceIdSchema).min(1).max(20),
})

export type BatchStageSummariesBody = z.infer<typeof batchStageSummariesBodySchema>

/** Decimal(18, 4): up to 14 digits before the point and 4 after. Kept as a string. */
const DECIMAL_PATTERN = /^\d{1,14}(\.\d{1,4})?$/

function decimalText(label: string) {
  return z.string().trim().regex(DECIMAL_PATTERN, `${label} must be a decimal with up to 4 places`)
}

function optionalDecimal(label: string) {
  return z.preprocess((value) => {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    return value
  }, decimalText(label).nullable().optional())
}

function blankToNull(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return typeof value === 'string' ? value.trim() : value
}

function optionalDateString(label: string) {
  return z.preprocess(
    blankToNull,
    z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: `${label} must be a valid date`,
      })
      .nullable()
      .optional(),
  )
}

function optionalText(max: number, label: string) {
  return z.preprocess(
    blankToNull,
    z.string().max(max, `${label} must be at most ${max} characters`).nullable().optional(),
  )
}

function dateOrder(earlier: string | null | undefined, later: string | null | undefined): boolean {
  if (!earlier || !later) return true
  return new Date(later).getTime() >= new Date(earlier).getTime()
}

/** ISO timestamp the client loaded; null only when creating the first stage row. */
const expectedUpdatedAtField = z.preprocess(
  blankToNull,
  z.string().datetime({ offset: true }).nullable(),
)

/** Draft-friendly upsert: all content fields optional; status required. */
export const upsertGeotechnicalBodySchema = z
  .object({
    soilType: optionalText(120, 'Soil type'),
    soilBearingCapacity: optionalDecimal('Soil bearing capacity'),
    groundwaterLevel: optionalDecimal('Groundwater level'),
    foundationRecommendation: optionalText(5000, 'Foundation recommendation'),
    reportFilePath: optionalText(500, 'Report file path'),
    consultantName: optionalText(120, 'Consultant name'),
    status: projectStageStatusSchema,
    startDate: optionalDateString('Start date'),
    completionDate: optionalDateString('Completion date'),
    notes: optionalText(5000, 'Notes'),
    expectedUpdatedAt: expectedUpdatedAtField,
  })
  .refine((value) => dateOrder(value.startDate, value.completionDate), {
    message: 'Completion date must be on or after the start date',
    path: ['completionDate'],
  })

export const upsertDesignBodySchema = z
  .object({
    architecturalDesignPath: optionalText(500, 'Architectural design path'),
    structuralDesignPath: optionalText(500, 'Structural design path'),
    mepDesignPath: optionalText(500, 'MEP design path'),
    architectName: optionalText(120, 'Architect name'),
    structuralEngineerName: optionalText(120, 'Structural engineer name'),
    mepEngineerName: optionalText(120, 'MEP engineer name'),
    status: projectStageStatusSchema,
    startDate: optionalDateString('Start date'),
    completionDate: optionalDateString('Completion date'),
    notes: optionalText(5000, 'Notes'),
    expectedUpdatedAt: expectedUpdatedAtField,
  })
  .refine((value) => dateOrder(value.startDate, value.completionDate), {
    message: 'Completion date must be on or after the start date',
    path: ['completionDate'],
  })

export const upsertLicensingBodySchema = z
  .object({
    permitNumber: optionalText(120, 'Permit number'),
    issuingAuthority: optionalText(200, 'Issuing authority'),
    applicationDate: optionalDateString('Application date'),
    approvalDate: optionalDateString('Approval date'),
    permitFilePath: optionalText(500, 'Permit file path'),
    status: projectStageStatusSchema,
    expiryDate: optionalDateString('Expiry date'),
    notes: optionalText(5000, 'Notes'),
    expectedUpdatedAt: expectedUpdatedAtField,
  })
  .refine((value) => dateOrder(value.applicationDate, value.approvalDate), {
    message: 'Approval date must be on or after the application date',
    path: ['approvalDate'],
  })
  .refine((value) => dateOrder(value.applicationDate, value.expiryDate), {
    message: 'Expiry date must be on or after the application date',
    path: ['expiryDate'],
  })

export const upsertMaterialsBodySchema = z
  .object({
    supplierName: optionalText(200, 'Supplier name'),
    materialDescription: optionalText(5000, 'Material description'),
    quantity: optionalDecimal('Quantity'),
    unit: optionalText(40, 'Unit'),
    totalCost: optionalDecimal('Total cost'),
    currency: optionalText(10, 'Currency'),
    originCountry: optionalText(100, 'Origin country'),
    orderDate: optionalDateString('Order date'),
    expectedArrivalDate: optionalDateString('Expected arrival date'),
    actualArrivalDate: optionalDateString('Actual arrival date'),
    invoiceFilePath: optionalText(500, 'Invoice file path'),
    status: projectStageStatusSchema,
    notes: optionalText(5000, 'Notes'),
    expectedUpdatedAt: expectedUpdatedAtField,
  })
  .refine((value) => dateOrder(value.orderDate, value.expectedArrivalDate), {
    message: 'Expected arrival date must be on or after the order date',
    path: ['expectedArrivalDate'],
  })
  .refine((value) => dateOrder(value.orderDate, value.actualArrivalDate), {
    message: 'Actual arrival date must be on or after the order date',
    path: ['actualArrivalDate'],
  })

export const upsertMaintenanceBodySchema = z
  .object({
    maintenanceType: optionalText(120, 'Maintenance type'),
    description: optionalText(5000, 'Description'),
    responsiblePerson: optionalText(120, 'Responsible person'),
    scheduledDate: optionalDateString('Scheduled date'),
    completionDate: optionalDateString('Completion date'),
    cost: optionalDecimal('Cost'),
    status: projectStageStatusSchema,
    reportFilePath: optionalText(500, 'Report file path'),
    notes: optionalText(5000, 'Notes'),
    expectedUpdatedAt: expectedUpdatedAtField,
  })
  .refine((value) => dateOrder(value.scheduledDate, value.completionDate), {
    message: 'Completion date must be on or after the scheduled date',
    path: ['completionDate'],
  })

export type UpsertGeotechnicalBody = z.infer<typeof upsertGeotechnicalBodySchema>
export type UpsertDesignBody = z.infer<typeof upsertDesignBodySchema>
export type UpsertLicensingBody = z.infer<typeof upsertLicensingBodySchema>
export type UpsertMaterialsBody = z.infer<typeof upsertMaterialsBodySchema>
export type UpsertMaintenanceBody = z.infer<typeof upsertMaintenanceBodySchema>
