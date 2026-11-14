import { prisma } from '../../database/prisma.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import type { ProjectStageStatus as PrismaStageStatus } from '../../generated/prisma/client.js'
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

export type ProjectStagesRepository = {
  findAllByProjectId: (projectId: string) => Promise<{
    geotechnical: GeotechnicalStudy | null
    design: ProjectDesign | null
    licensing: ProjectLicensing | null
    materials: MaterialProcurement | null
    maintenance: ProjectMaintenance | null
  }>
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
      const [geotechnical, design, licensing, materials, maintenance] = await Promise.all([
        prisma.geotechnicalStudy.findUnique({ where: { projectId } }),
        prisma.projectDesign.findUnique({ where: { projectId } }),
        prisma.projectLicensing.findUnique({ where: { projectId } }),
        prisma.materialProcurement.findUnique({ where: { projectId } }),
        prisma.projectMaintenance.findUnique({ where: { projectId } }),
      ])
      return {
        geotechnical: geotechnical ? mapGeotechnical(geotechnical) : null,
        design: design ? mapDesign(design) : null,
        licensing: licensing ? mapLicensing(licensing) : null,
        materials: materials ? mapMaterials(materials) : null,
        maintenance: maintenance ? mapMaintenance(maintenance) : null,
      }
    },

    async findGeotechnical(projectId) {
      const row = await prisma.geotechnicalStudy.findUnique({ where: { projectId } })
      return row ? mapGeotechnical(row) : null
    },

    async upsertGeotechnical(projectId, input) {
      const data = {
        soilType: textOrNull(input.soilType),
        soilBearingCapacity: input.soilBearingCapacity ?? null,
        groundwaterLevel: input.groundwaterLevel ?? null,
        foundationRecommendation: textOrNull(input.foundationRecommendation),
        reportFilePath: textOrNull(input.reportFilePath),
        consultantName: textOrNull(input.consultantName),
        status: input.status,
        startDate: toDate(input.startDate),
        completionDate: toDate(input.completionDate),
        notes: textOrNull(input.notes),
      }
      return translateUniqueConflict(async () => {
        const row = await prisma.geotechnicalStudy.upsert({
          where: { projectId },
          create: { projectId, ...data },
          update: data,
        })
        return mapGeotechnical(row)
      })
    },

    async findDesign(projectId) {
      const row = await prisma.projectDesign.findUnique({ where: { projectId } })
      return row ? mapDesign(row) : null
    },

    async upsertDesign(projectId, input) {
      const data = {
        architecturalDesignPath: textOrNull(input.architecturalDesignPath),
        structuralDesignPath: textOrNull(input.structuralDesignPath),
        mepDesignPath: textOrNull(input.mepDesignPath),
        architectName: textOrNull(input.architectName),
        structuralEngineerName: textOrNull(input.structuralEngineerName),
        mepEngineerName: textOrNull(input.mepEngineerName),
        status: input.status,
        startDate: toDate(input.startDate),
        completionDate: toDate(input.completionDate),
        notes: textOrNull(input.notes),
      }
      return translateUniqueConflict(async () => {
        const row = await prisma.projectDesign.upsert({
          where: { projectId },
          create: { projectId, ...data },
          update: data,
        })
        return mapDesign(row)
      })
    },

    async findLicensing(projectId) {
      const row = await prisma.projectLicensing.findUnique({ where: { projectId } })
      return row ? mapLicensing(row) : null
    },

    async upsertLicensing(projectId, input) {
      const data = {
        permitNumber: textOrNull(input.permitNumber),
        issuingAuthority: textOrNull(input.issuingAuthority),
        applicationDate: toDate(input.applicationDate),
        approvalDate: toDate(input.approvalDate),
        permitFilePath: textOrNull(input.permitFilePath),
        status: input.status,
        expiryDate: toDate(input.expiryDate),
        notes: textOrNull(input.notes),
      }
      return translateUniqueConflict(async () => {
        const row = await prisma.projectLicensing.upsert({
          where: { projectId },
          create: { projectId, ...data },
          update: data,
        })
        return mapLicensing(row)
      })
    },

    async findMaterials(projectId) {
      const row = await prisma.materialProcurement.findUnique({ where: { projectId } })
      return row ? mapMaterials(row) : null
    },

    async upsertMaterials(projectId, input) {
      const data = {
        supplierName: textOrNull(input.supplierName),
        materialDescription: textOrNull(input.materialDescription),
        quantity: input.quantity ?? null,
        unit: textOrNull(input.unit),
        totalCost: input.totalCost ?? null,
        currency: textOrNull(input.currency),
        originCountry: textOrNull(input.originCountry),
        orderDate: toDate(input.orderDate),
        expectedArrivalDate: toDate(input.expectedArrivalDate),
        actualArrivalDate: toDate(input.actualArrivalDate),
        invoiceFilePath: textOrNull(input.invoiceFilePath),
        status: input.status,
        notes: textOrNull(input.notes),
      }
      return translateUniqueConflict(async () => {
        const row = await prisma.materialProcurement.upsert({
          where: { projectId },
          create: { projectId, ...data },
          update: data,
        })
        return mapMaterials(row)
      })
    },

    async findMaintenance(projectId) {
      const row = await prisma.projectMaintenance.findUnique({ where: { projectId } })
      return row ? mapMaintenance(row) : null
    },

    async upsertMaintenance(projectId, input) {
      const data = {
        maintenanceType: textOrNull(input.maintenanceType),
        description: textOrNull(input.description),
        responsiblePerson: textOrNull(input.responsiblePerson),
        scheduledDate: toDate(input.scheduledDate),
        completionDate: toDate(input.completionDate),
        cost: input.cost ?? null,
        status: input.status,
        reportFilePath: textOrNull(input.reportFilePath),
        notes: textOrNull(input.notes),
      }
      return translateUniqueConflict(async () => {
        const row = await prisma.projectMaintenance.upsert({
          where: { projectId },
          create: { projectId, ...data },
          update: data,
        })
        return mapMaintenance(row)
      })
    },
  }
}
