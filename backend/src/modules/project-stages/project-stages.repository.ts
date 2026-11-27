import { prisma } from '../../database/prisma.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import { conflict } from '../../errors/app-error.js'
import type { ProjectStageStatus as PrismaStageStatus } from '../../generated/prisma/client.js'
import { logPerf } from '../../logging/perf.js'
import type {
  UpsertDesignBody,
  UpsertGeotechnicalBody,
  UpsertLicensingBody,
  UpsertMaintenanceBody,
  UpsertMaterialsBody,
} from './project-stages.schema.js'
import type {
  GeotechnicalStudy,
  MaterialProcurement,
  ProjectDesign,
  ProjectLicensing,
  ProjectMaintenance,
  ProjectStageStatus,
} from './project-stages.types.js'

function toIso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null
}

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null
}

function decimalToString(value: { toString(): string } | null | undefined): string | null {
  return value == null ? null : value.toString()
}

function textOrNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Compare-and-swap upsert keyed by projectId.
 * `expectedUpdatedAt === null` is create-only; a non-null token updates only if
 * the row's updatedAt still matches (same pattern as worker CV).
 */
async function casUpsertByProjectId<TRow>(options: {
  projectId: string
  expectedUpdatedAt: string | null
  findExistingId: () => Promise<string | null>
  create: () => Promise<TRow>
  updateMany: (expected: Date) => Promise<number>
  findAfterUpdate: () => Promise<TRow>
}): Promise<TRow> {
  const { expectedUpdatedAt } = options
  return translateUniqueConflict(async () => {
    if (expectedUpdatedAt == null) {
      const existing = await options.findExistingId()
      if (existing) {
        throw conflict(
          'expectedUpdatedAt is required to update an existing stage',
          'STAGE_VERSION_REQUIRED',
        )
      }
      return options.create()
    }

    const expected = new Date(expectedUpdatedAt)
    if (Number.isNaN(expected.getTime())) {
      throw conflict('expectedUpdatedAt must be a valid timestamp', 'STAGE_VERSION_INVALID')
    }

    const count = await options.updateMany(expected)
    if (count !== 1) {
      const stillThere = await options.findExistingId()
      if (!stillThere) {
        throw conflict(
          'expectedUpdatedAt must be null when creating a stage',
          'STAGE_VERSION_INVALID',
        )
      }
      throw conflict('Stage was modified elsewhere; reload and try again', 'STAGE_VERSION_CONFLICT')
    }
    return options.findAfterUpdate()
  })
}

function mapGeotechnical(row: {
  id: string
  projectId: string
  soilType: string | null
  soilBearingCapacity: { toString(): string } | null
  groundwaterLevel: { toString(): string } | null
  foundationRecommendation: string | null
  reportFilePath: string | null
  consultantName: string | null
  status: PrismaStageStatus
  startDate: Date | null
  completionDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}): GeotechnicalStudy {
  return {
    id: row.id,
    projectId: row.projectId,
    soilType: row.soilType,
    soilBearingCapacity: decimalToString(row.soilBearingCapacity),
    groundwaterLevel: decimalToString(row.groundwaterLevel),
    foundationRecommendation: row.foundationRecommendation,
    reportFilePath: row.reportFilePath,
    consultantName: row.consultantName,
    status: row.status as ProjectStageStatus,
    startDate: toIso(row.startDate),
    completionDate: toIso(row.completionDate),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapDesign(row: {
  id: string
  projectId: string
  architecturalDesignPath: string | null
  structuralDesignPath: string | null
  mepDesignPath: string | null
  architectName: string | null
  structuralEngineerName: string | null
  mepEngineerName: string | null
  status: PrismaStageStatus
  startDate: Date | null
  completionDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}): ProjectDesign {
  return {
    id: row.id,
    projectId: row.projectId,
    architecturalDesignPath: row.architecturalDesignPath,
    structuralDesignPath: row.structuralDesignPath,
    mepDesignPath: row.mepDesignPath,
    architectName: row.architectName,
    structuralEngineerName: row.structuralEngineerName,
    mepEngineerName: row.mepEngineerName,
    status: row.status as ProjectStageStatus,
    startDate: toIso(row.startDate),
    completionDate: toIso(row.completionDate),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapLicensing(row: {
  id: string
  projectId: string
  permitNumber: string | null
  issuingAuthority: string | null
  applicationDate: Date | null
  approvalDate: Date | null
  permitFilePath: string | null
  status: PrismaStageStatus
  expiryDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}): ProjectLicensing {
  return {
    id: row.id,
    projectId: row.projectId,
    permitNumber: row.permitNumber,
    issuingAuthority: row.issuingAuthority,
    applicationDate: toIso(row.applicationDate),
    approvalDate: toIso(row.approvalDate),
    permitFilePath: row.permitFilePath,
    status: row.status as ProjectStageStatus,
    expiryDate: toIso(row.expiryDate),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapMaterials(row: {
  id: string
  projectId: string
  supplierName: string | null
  materialDescription: string | null
  quantity: { toString(): string } | null
  unit: string | null
  totalCost: { toString(): string } | null
  currency: string | null
  originCountry: string | null
  orderDate: Date | null
  expectedArrivalDate: Date | null
  actualArrivalDate: Date | null
  invoiceFilePath: string | null
  status: PrismaStageStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
}): MaterialProcurement {
  return {
    id: row.id,
    projectId: row.projectId,
    supplierName: row.supplierName,
    materialDescription: row.materialDescription,
    quantity: decimalToString(row.quantity),
    unit: row.unit,
    totalCost: decimalToString(row.totalCost),
    currency: row.currency,
    originCountry: row.originCountry,
    orderDate: toIso(row.orderDate),
    expectedArrivalDate: toIso(row.expectedArrivalDate),
    actualArrivalDate: toIso(row.actualArrivalDate),
    invoiceFilePath: row.invoiceFilePath,
    status: row.status as ProjectStageStatus,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapMaintenance(row: {
  id: string
  projectId: string
  maintenanceType: string | null
  description: string | null
  responsiblePerson: string | null
  scheduledDate: Date | null
  completionDate: Date | null
  cost: { toString(): string } | null
  status: PrismaStageStatus
  reportFilePath: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}): ProjectMaintenance {
  return {
    id: row.id,
    projectId: row.projectId,
    maintenanceType: row.maintenanceType,
    description: row.description,
    responsiblePerson: row.responsiblePerson,
    scheduledDate: toIso(row.scheduledDate),
    completionDate: toIso(row.completionDate),
    cost: decimalToString(row.cost),
    status: row.status as ProjectStageStatus,
    reportFilePath: row.reportFilePath,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export type ProjectStagesRows = {
  geotechnical: GeotechnicalStudy | null
  design: ProjectDesign | null
  licensing: ProjectLicensing | null
  materials: MaterialProcurement | null
  maintenance: ProjectMaintenance | null
}

export type ProjectStagesRepository = {
  findAllByProjectId: (projectId: string) => Promise<ProjectStagesRows>
  findAllByProjectIds: (projectIds: string[]) => Promise<
    Array<
      ProjectStagesRows & {
        projectId: string
        ownerId: string
      }
    >
  >
  findGeotechnical: (projectId: string) => Promise<GeotechnicalStudy | null>
  upsertGeotechnical: (
    projectId: string,
    input: UpsertGeotechnicalBody,
  ) => Promise<GeotechnicalStudy>
  findDesign: (projectId: string) => Promise<ProjectDesign | null>
  upsertDesign: (projectId: string, input: UpsertDesignBody) => Promise<ProjectDesign>
  findLicensing: (projectId: string) => Promise<ProjectLicensing | null>
  upsertLicensing: (projectId: string, input: UpsertLicensingBody) => Promise<ProjectLicensing>
  findMaterials: (projectId: string) => Promise<MaterialProcurement | null>
  upsertMaterials: (projectId: string, input: UpsertMaterialsBody) => Promise<MaterialProcurement>
  findMaintenance: (projectId: string) => Promise<ProjectMaintenance | null>
  upsertMaintenance: (
    projectId: string,
    input: UpsertMaintenanceBody,
  ) => Promise<ProjectMaintenance>
}

export function createProjectStagesRepository(): ProjectStagesRepository {
  return {
    async findAllByProjectId(projectId) {
      const started = performance.now()
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          geotechnicalStudy: true,
          design: true,
          licensing: true,
          materialProcurement: true,
          maintenance: true,
        },
      })
      const ms = Math.round(performance.now() - started)
      logPerf('stages', `findAllByProjectId ${ms}ms`, { projectId, ms, queries: 1 })
      return {
        geotechnical: project?.geotechnicalStudy
          ? mapGeotechnical(project.geotechnicalStudy)
          : null,
        design: project?.design ? mapDesign(project.design) : null,
        licensing: project?.licensing ? mapLicensing(project.licensing) : null,
        materials: project?.materialProcurement ? mapMaterials(project.materialProcurement) : null,
        maintenance: project?.maintenance ? mapMaintenance(project.maintenance) : null,
      }
    },

    async findAllByProjectIds(projectIds) {
      if (projectIds.length === 0) return []
      const started = performance.now()
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          id: true,
          ownerId: true,
          geotechnicalStudy: true,
          design: true,
          licensing: true,
          materialProcurement: true,
          maintenance: true,
        },
      })
      const ms = Math.round(performance.now() - started)
      logPerf('stages', `findAllByProjectIds ${ms}ms`, {
        count: projectIds.length,
        ms,
        queries: 1,
      })
      return projects.map((project) => ({
        projectId: project.id,
        ownerId: project.ownerId,
        geotechnical: project.geotechnicalStudy ? mapGeotechnical(project.geotechnicalStudy) : null,
        design: project.design ? mapDesign(project.design) : null,
        licensing: project.licensing ? mapLicensing(project.licensing) : null,
        materials: project.materialProcurement ? mapMaterials(project.materialProcurement) : null,
        maintenance: project.maintenance ? mapMaintenance(project.maintenance) : null,
      }))
    },

    async findGeotechnical(projectId) {
      const row = await prisma.geotechnicalStudy.findUnique({ where: { projectId } })
      return row ? mapGeotechnical(row) : null
    },

    async upsertGeotechnical(projectId, input) {
      const { expectedUpdatedAt, ...fields } = input
      const data = {
        soilType: textOrNull(fields.soilType),
        soilBearingCapacity: fields.soilBearingCapacity ?? null,
        groundwaterLevel: fields.groundwaterLevel ?? null,
        foundationRecommendation: textOrNull(fields.foundationRecommendation),
        reportFilePath: textOrNull(fields.reportFilePath),
        consultantName: textOrNull(fields.consultantName),
        status: fields.status,
        startDate: toDate(fields.startDate),
        completionDate: toDate(fields.completionDate),
        notes: textOrNull(fields.notes),
      }
      return casUpsertByProjectId({
        projectId,
        expectedUpdatedAt,
        findExistingId: async () => {
          const row = await prisma.geotechnicalStudy.findUnique({
            where: { projectId },
            select: { id: true },
          })
          return row?.id ?? null
        },
        create: async () =>
          mapGeotechnical(await prisma.geotechnicalStudy.create({ data: { projectId, ...data } })),
        updateMany: async (expected) => {
          const cas = await prisma.geotechnicalStudy.updateMany({
            where: { projectId, updatedAt: expected },
            data,
          })
          return cas.count
        },
        findAfterUpdate: async () =>
          mapGeotechnical(
            await prisma.geotechnicalStudy.findUniqueOrThrow({ where: { projectId } }),
          ),
      })
    },

    async findDesign(projectId) {
      const row = await prisma.projectDesign.findUnique({ where: { projectId } })
      return row ? mapDesign(row) : null
    },

    async upsertDesign(projectId, input) {
      const { expectedUpdatedAt, ...fields } = input
      const data = {
        architecturalDesignPath: textOrNull(fields.architecturalDesignPath),
        structuralDesignPath: textOrNull(fields.structuralDesignPath),
        mepDesignPath: textOrNull(fields.mepDesignPath),
        architectName: textOrNull(fields.architectName),
        structuralEngineerName: textOrNull(fields.structuralEngineerName),
        mepEngineerName: textOrNull(fields.mepEngineerName),
        status: fields.status,
        startDate: toDate(fields.startDate),
        completionDate: toDate(fields.completionDate),
        notes: textOrNull(fields.notes),
      }
      return casUpsertByProjectId({
        projectId,
        expectedUpdatedAt,
        findExistingId: async () => {
          const row = await prisma.projectDesign.findUnique({
            where: { projectId },
            select: { id: true },
          })
          return row?.id ?? null
        },
        create: async () =>
          mapDesign(await prisma.projectDesign.create({ data: { projectId, ...data } })),
        updateMany: async (expected) => {
          const cas = await prisma.projectDesign.updateMany({
            where: { projectId, updatedAt: expected },
            data,
          })
          return cas.count
        },
        findAfterUpdate: async () =>
          mapDesign(await prisma.projectDesign.findUniqueOrThrow({ where: { projectId } })),
      })
    },

    async findLicensing(projectId) {
      const row = await prisma.projectLicensing.findUnique({ where: { projectId } })
      return row ? mapLicensing(row) : null
    },

    async upsertLicensing(projectId, input) {
      const { expectedUpdatedAt, ...fields } = input
      const data = {
        permitNumber: textOrNull(fields.permitNumber),
        issuingAuthority: textOrNull(fields.issuingAuthority),
        applicationDate: toDate(fields.applicationDate),
        approvalDate: toDate(fields.approvalDate),
        permitFilePath: textOrNull(fields.permitFilePath),
        status: fields.status,
        expiryDate: toDate(fields.expiryDate),
        notes: textOrNull(fields.notes),
      }
      return casUpsertByProjectId({
        projectId,
        expectedUpdatedAt,
        findExistingId: async () => {
          const row = await prisma.projectLicensing.findUnique({
            where: { projectId },
            select: { id: true },
          })
          return row?.id ?? null
        },
        create: async () =>
          mapLicensing(await prisma.projectLicensing.create({ data: { projectId, ...data } })),
        updateMany: async (expected) => {
          const cas = await prisma.projectLicensing.updateMany({
            where: { projectId, updatedAt: expected },
            data,
          })
          return cas.count
        },
        findAfterUpdate: async () =>
          mapLicensing(await prisma.projectLicensing.findUniqueOrThrow({ where: { projectId } })),
      })
    },

    async findMaterials(projectId) {
      const row = await prisma.materialProcurement.findUnique({ where: { projectId } })
      return row ? mapMaterials(row) : null
    },

    async upsertMaterials(projectId, input) {
      const { expectedUpdatedAt, ...fields } = input
      const data = {
        supplierName: textOrNull(fields.supplierName),
        materialDescription: textOrNull(fields.materialDescription),
        quantity: fields.quantity ?? null,
        unit: textOrNull(fields.unit),
        totalCost: fields.totalCost ?? null,
        currency: textOrNull(fields.currency),
        originCountry: textOrNull(fields.originCountry),
        orderDate: toDate(fields.orderDate),
        expectedArrivalDate: toDate(fields.expectedArrivalDate),
        actualArrivalDate: toDate(fields.actualArrivalDate),
        invoiceFilePath: textOrNull(fields.invoiceFilePath),
        status: fields.status,
        notes: textOrNull(fields.notes),
      }
      return casUpsertByProjectId({
        projectId,
        expectedUpdatedAt,
        findExistingId: async () => {
          const row = await prisma.materialProcurement.findUnique({
            where: { projectId },
            select: { id: true },
          })
          return row?.id ?? null
        },
        create: async () =>
          mapMaterials(await prisma.materialProcurement.create({ data: { projectId, ...data } })),
        updateMany: async (expected) => {
          const cas = await prisma.materialProcurement.updateMany({
            where: { projectId, updatedAt: expected },
            data,
          })
          return cas.count
        },
        findAfterUpdate: async () =>
          mapMaterials(
            await prisma.materialProcurement.findUniqueOrThrow({ where: { projectId } }),
          ),
      })
    },

    async findMaintenance(projectId) {
      const row = await prisma.projectMaintenance.findUnique({ where: { projectId } })
      return row ? mapMaintenance(row) : null
    },

    async upsertMaintenance(projectId, input) {
      const { expectedUpdatedAt, ...fields } = input
      const data = {
        maintenanceType: textOrNull(fields.maintenanceType),
        description: textOrNull(fields.description),
        responsiblePerson: textOrNull(fields.responsiblePerson),
        scheduledDate: toDate(fields.scheduledDate),
        completionDate: toDate(fields.completionDate),
        cost: fields.cost ?? null,
        status: fields.status,
        reportFilePath: textOrNull(fields.reportFilePath),
        notes: textOrNull(fields.notes),
      }
      return casUpsertByProjectId({
        projectId,
        expectedUpdatedAt,
        findExistingId: async () => {
          const row = await prisma.projectMaintenance.findUnique({
            where: { projectId },
            select: { id: true },
          })
          return row?.id ?? null
        },
        create: async () =>
          mapMaintenance(await prisma.projectMaintenance.create({ data: { projectId, ...data } })),
        updateMany: async (expected) => {
          const cas = await prisma.projectMaintenance.updateMany({
            where: { projectId, updatedAt: expected },
            data,
          })
          return cas.count
        },
        findAfterUpdate: async () =>
          mapMaintenance(
            await prisma.projectMaintenance.findUniqueOrThrow({ where: { projectId } }),
          ),
      })
    },
  }
}
