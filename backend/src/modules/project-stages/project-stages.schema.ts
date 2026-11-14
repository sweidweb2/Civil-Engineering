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

/** Accept ISO datetime or YYYY-MM-DD date strings. */
function dateString(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: `${label} must be a valid date`,
    })
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

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`)
}

function dateOrder(earlier: string | null | undefined, later: string | null | undefined): boolean {
  if (!earlier || !later) return true
  return new Date(later).getTime() >= new Date(earlier).getTime()
}

export const upsertGeotechnicalBodySchema = z
  .object({
    soilType: requiredText(120, 'Soil type'),
    soilBearingCapacity: decimalText('Soil bearing capacity'),
    groundwaterLevel: optionalDecimal('Groundwater level'),
    foundationRecommendation: requiredText(5000, 'Foundation recommendation'),
    reportFilePath: requiredText(500, 'Report file path'),
    consultantName: requiredText(120, 'Consultant name'),
    status: projectStageStatusSchema,
    startDate: dateString('Start date'),
    completionDate: dateString('Completion date'),
    notes: requiredText(5000, 'Notes'),
  })
  .refine((value) => dateOrder(value.startDate, value.completionDate), {
    message: 'Completion date must be on or after the start date',
    path: ['completionDate'],
  })

export const upsertDesignBodySchema = z
  .object({
    architecturalDesignPath: requiredText(500, 'Architectural design path'),
    structuralDesignPath: requiredText(500, 'Structural design path'),
    mepDesignPath: requiredText(500, 'MEP design path'),
    architectName: requiredText(120, 'Architect name'),
    structuralEngineerName: requiredText(120, 'Structural engineer name'),
    mepEngineerName: requiredText(120, 'MEP engineer name'),
    status: projectStageStatusSchema,
    startDate: dateString('Start date'),
    completionDate: dateString('Completion date'),
    notes: requiredText(5000, 'Notes'),
  })
  .refine((value) => dateOrder(value.startDate, value.completionDate), {
    message: 'Completion date must be on or after the start date',
    path: ['completionDate'],
  })

export const upsertLicensingBodySchema = z
  .object({
    permitNumber: requiredText(120, 'Permit number'),
    issuingAuthority: requiredText(200, 'Issuing authority'),
    applicationDate: dateString('Application date'),
    approvalDate: optionalDateString('Approval date'),
    permitFilePath: requiredText(500, 'Permit file path'),
    status: projectStageStatusSchema,
    expiryDate: optionalDateString('Expiry date'),
    notes: requiredText(5000, 'Notes'),
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
    supplierName: requiredText(200, 'Supplier name'),
    materialDescription: requiredText(5000, 'Material description'),
    quantity: decimalText('Quantity'),
    unit: requiredText(40, 'Unit'),
    totalCost: decimalText('Total cost'),
    currency: requiredText(10, 'Currency'),
    originCountry: requiredText(100, 'Origin country'),
    orderDate: dateString('Order date'),
    expectedArrivalDate: dateString('Expected arrival date'),
    actualArrivalDate: optionalDateString('Actual arrival date'),
    invoiceFilePath: requiredText(500, 'Invoice file path'),
    status: projectStageStatusSchema,
    notes: requiredText(5000, 'Notes'),
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
    maintenanceType: requiredText(120, 'Maintenance type'),
    description: requiredText(5000, 'Description'),
    responsiblePerson: requiredText(120, 'Responsible person'),
    scheduledDate: dateString('Scheduled date'),
    completionDate: optionalDateString('Completion date'),
    cost: decimalText('Cost'),
    status: projectStageStatusSchema,
    reportFilePath: requiredText(500, 'Report file path'),
    notes: requiredText(5000, 'Notes'),
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
